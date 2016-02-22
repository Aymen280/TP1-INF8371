/*
 * SonarQube
 * Copyright (C) 2009-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
/*global d3:false, SonarWidgets:false */
/*jshint eqnull:true */

window.SonarWidgets = window.SonarWidgets == null ? {} : window.SonarWidgets;

(function () {

  window.SonarWidgets.Widget = function () {
    // Set default values
    this._type = null;
    this._source = null;
    this._metricsPriority = null;
    this._height = null;
    this._options = {};


    // Export global variables
    this.type = function (_) {
      return param.call(this, '_type', _);
    };

    this.source = function (_) {
      return param.call(this, '_source', _);
    };

    this.metricsPriority = function (_) {
      return param.call(this, '_metricsPriority', _);
    };

    this.height = function (_) {
      return param.call(this, '_height', _);
    };

    this.options = function (_) {
      return param.call(this, '_options', _);
    };
  };


  window.SonarWidgets.Widget.prototype.render = function(container) {
    const that = this;

    this.showSpinner(container);
    d3.json(this.source(), function(error, response) {
      if (response && !error) {
        that.hideSpinner();
        if (typeof response.components === 'undefined' || response.components.length > 0) {
          that.widget = new SonarWidgets[that.type()]();
          that.widget.metricsPriority(that.metricsPriority());
          that.widget.options(that.options());
          that.widget.metrics(response.metrics);
          that.widget.components(response.components);
          if (typeof that.widget.parseSource === 'function') {
            that.widget.parseSource(response);
          }
          if (typeof that.widget.maxResultsReached === 'function') {
            that.widget.maxResultsReached(response.paging != null && response.paging.pages > 1);
          }
          if (that.height()) {
            that.widget.height(that.height());
          }
          that.widget.render(container);
        } else {
          d3.select(container).html(that.options().noData);
        }
      }
    });
  };


  window.SonarWidgets.Widget.prototype.showSpinner = function(container) {
    this.spinner = d3.select(container).append('i').classed('spinner', true);
  };


  window.SonarWidgets.Widget.prototype.hideSpinner = function() {
    if (this.spinner) {
      this.spinner.remove();
    }
  };


  window.SonarWidgets.Widget.prototype.update = function(container) {
    return this.widget && this.widget.update(container);
  };



  // Some helper functions

  // Gets or sets parameter
  function param(name, value) {
    if (value == null) {
      return this[name];
    } else {
      this[name] = value;
      return this;
    }
  }

})();
