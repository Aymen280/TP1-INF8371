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
import _ from 'underscore';
import Marionette from 'backbone.marionette';
import ModalForm from '../../components/common/modal-form';
import Template from './templates/quality-gates-condition-delete.hbs';

export default ModalForm.extend({
  template: Template,

  onFormSubmit () {
    ModalForm.prototype.onFormSubmit.apply(this, arguments);
    this.disableForm();
    this.sendRequest();
  },

  sendRequest () {
    const that = this;
    const options = {
      statusCode: {
        // do not show global error
        400: null
      }
    };
    return this.model.destroy(options)
        .done(function () {
          that.destroy();
        }).fail(function (jqXHR) {
          that.enableForm();
          that.showErrors(jqXHR.responseJSON.errors, jqXHR.responseJSON.warnings);
        });
  },

  serializeData () {
    return _.extend(Marionette.ItemView.prototype.serializeData.apply(this, arguments), {
      metric: this.options.metric
    });
  }
});


