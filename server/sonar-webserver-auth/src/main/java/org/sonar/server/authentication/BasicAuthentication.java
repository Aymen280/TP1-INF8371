/*
 * SonarQube
 * Copyright (C) 2009-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.server.authentication;

import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.sonar.api.server.http.HttpRequest;
import org.sonar.db.user.UserDto;
import org.sonar.server.authentication.event.AuthenticationEvent;
import org.sonar.server.authentication.event.AuthenticationException;
import org.sonar.server.usertoken.UserTokenAuthentication;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.apache.commons.lang3.StringUtils.startsWithIgnoreCase;
import static org.sonar.server.authentication.event.AuthenticationEvent.Method;
import static org.sonar.server.authentication.event.AuthenticationEvent.Source;

/**
 * HTTP BASIC authentication relying on tuple {login, password}.
 * Login can represent a user access token.
 *
 * @see CredentialsAuthentication for standard login/password authentication
 * @see UserTokenAuthentication for user access token
 */


public class BasicAuthentication {
   static class FailedLoginAttempt {
    int attempts;
    Instant lastFailedAttempt;

    public int getAttempts() {
      return attempts;
    }

    FailedLoginAttempt() {
      this.attempts = 1;
      this.lastFailedAttempt = Instant.now();
    }
  }
  static final Map<String, FailedLoginAttempt> failedLoginAttempts = new ConcurrentHashMap<>();
  private static final int MAX_FAILED_ATTEMPTS = 5;
  private static final long BLOCK_TIME_SECONDS = 300; // 5 minutes
  private final CredentialsAuthentication credentialsAuthentication;
  private final UserTokenAuthentication userTokenAuthentication;

  public BasicAuthentication(CredentialsAuthentication credentialsAuthentication, UserTokenAuthentication userTokenAuthentication) {
    this.credentialsAuthentication = credentialsAuthentication;
    this.userTokenAuthentication = userTokenAuthentication;
  }

  public Optional<UserDto> authenticate(HttpRequest request) {
    return extractCredentialsFromHeader(request)
      .flatMap(credentials -> Optional.ofNullable(authenticate(credentials, request)));
  }

  public static Optional<Credentials> extractCredentialsFromHeader(HttpRequest request) {
    String authorizationHeader = request.getHeader("Authorization");
    if (authorizationHeader == null || !startsWithIgnoreCase(authorizationHeader, "BASIC")) {
      return Optional.empty();
    }

    String basicAuthEncoded = authorizationHeader.substring(6);
    String basicAuthDecoded = getDecodedBasicAuth(basicAuthEncoded);

    int semiColonPos = basicAuthDecoded.indexOf(':');
    if (semiColonPos <= 0) {
      throw AuthenticationException.newBuilder()
        .setSource(Source.local(Method.BASIC))
        .setMessage("Decoded basic auth does not contain ':'")
        .build();
    }
    String login = basicAuthDecoded.substring(0, semiColonPos);
    String password = basicAuthDecoded.substring(semiColonPos + 1);
    return Optional.of(new Credentials(login, password));
  }

  private static String getDecodedBasicAuth(String basicAuthEncoded) {
    try {
      return new String(Base64.getDecoder().decode(basicAuthEncoded.getBytes(UTF_8)), UTF_8);
    } catch (Exception e) {
      throw AuthenticationException.newBuilder()
        .setSource(Source.local(Method.BASIC))
        .setMessage("Invalid basic header")
        .build();
    }
  }

  private UserDto authenticate(Credentials credentials, HttpRequest request) {
    if (isUserBlocked(credentials.getLogin())) {
      throw AuthenticationException.newBuilder()
              .setSource(AuthenticationEvent.Source.local(AuthenticationEvent.Method.SONARQUBE_TOKEN))
              .setMessage("User is blocked")
              .build();
    }
    if (credentials.getPassword().isEmpty()) {
      Optional<UserAuthResult> userAuthResult = userTokenAuthentication.authenticate(request);
      if (userAuthResult.isPresent()) {
        resetFailedAttempts(credentials.getLogin());
        return userAuthResult.get().getUserDto();
      } else {
        registerFailedAttempt(credentials.getLogin());
        throw AuthenticationException.newBuilder()
          .setSource(AuthenticationEvent.Source.local(AuthenticationEvent.Method.SONARQUBE_TOKEN))
          .setMessage("User doesn't exist")
          .build();
      }
    }
    return credentialsAuthentication.authenticate(credentials, request, Method.BASIC);
  }

   void registerFailedAttempt(String username) {
    failedLoginAttempts.compute(username, (key, attempt) -> {
      if (attempt == null) {
        return new FailedLoginAttempt();
      } else {
        attempt.attempts++;
        attempt.lastFailedAttempt = Instant.now();
        return attempt;
      }
    });
    System.out.println(String.format("User '%s' has %d failed attempts.", username, failedLoginAttempts.get(username).attempts));
  }

  void resetFailedAttempts(String username) {
    failedLoginAttempts.remove(username);
  }

  boolean isUserBlocked(String username) {
    FailedLoginAttempt attempt = failedLoginAttempts.get(username);
    if (attempt != null && attempt.attempts >= MAX_FAILED_ATTEMPTS) {
      long timeElapsed = Instant.now().getEpochSecond() - attempt.lastFailedAttempt.getEpochSecond();
      if (timeElapsed < BLOCK_TIME_SECONDS) {
        return true;
      } else {
        resetFailedAttempts(username);
      }
    }
    return false;
  }


}
