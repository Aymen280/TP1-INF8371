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
import Template from './templates/quality-profiles-profile.hbs';
import { formatMeasure } from '../../helpers/measures';


export default Marionette.ItemView.extend({
  tagName: 'a',
  className: 'list-group-item',
  template: Template,

  modelEvents: {
    'change': 'render'
  },

  events: {
    'click': 'onClick'
  },

  onRender () {
    this.$el.toggleClass('active', this.options.highlighted);
    this.$el.attr('data-key', this.model.id);
    this.$el.attr('data-language', this.model.get('language'));
    this.$('[data-toggle="tooltip"]').tooltip({ container: 'body' });
  },

  onDestroy () {
    this.$('[data-toggle="tooltip"]').tooltip('destroy');
  },

  onClick (e) {
    e.preventDefault();
    this.model.trigger('select', this.model);
  },

  serializeData () {
    return _.extend(Marionette.ItemView.prototype.serializeData.apply(this, arguments), {
      projectCountFormatted: formatMeasure(this.model.get('projectCount'), 'INT')
    });
  }
});


