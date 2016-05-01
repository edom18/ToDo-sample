(function (ns) {

    'use strict';

    var generateUUID = (function () {

		// http://www.broofa.com/Tools/Math.uuid.htm
		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split( '' );
		var uuid = new Array( 36 );
		var rnd = 0, r;

		return function () {
			for (var i = 0; i < 36; i ++) {
				if (i === 8 || i === 13 || i === 18 || i === 23) {
					uuid[i] = '-';
				}
                else if (i === 14) {
					uuid[i] = '4';
				}
                else {
					if (rnd <= 0x02) rnd = 0x2000000 + ( Math.random() * 0x1000000 ) | 0;
					r = rnd & 0xf;
					rnd = rnd >> 4;
					uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];
				}
			}

			return uuid.join('');
		};
	}());


    /**
     * EventDisptcher class
     *
     * This class provide a event dispatch system.
     */
    function EventDisptcher() {
        this.handlers = {};
    }
    EventDisptcher.prototype = {

        constructor: EventDisptcher,

        /**
         * Store handlers list.
         */
        handlers: null,

        /**
         * Add event listener to this object.
         *
         * @param {string} eventName
         * @param {Function} handler
         * @param {Function?} context A context function
         */
        addListener: function (eventName, handler, context) {
            if (!this.handlers[eventName]) {
                this.handlers[eventName] = [];
            }

            context = context || this;
            this.handlers[eventName].push([handler, context]);
        },

        /**
         * Remove event listener from this object.
         *
         * @param {string} eventName
         * @[aram {Function} handler
         */
        removeListener: function (eventName, handler) {
            if (!this.handlers[eventName]) {
                return;
            }

            var handlers = this.handlers[eventName];
            for (var i = 0, len = handlers.length; i < len; i++) {
                if (handlers[i][0] === handler) {
                    handlers.splice(i, 1);
                    break;
                }
            }
        },

        /**
         * Fire event at once.
         *
         * @param {string} eventName
         * @param {Function} handler
         * @param {Function?} context A context function
         */
        one: function (eventName, handler, context) {
            var self = this;
            var func = function () {
                handler.call(context || self);
                self.removeListener(eventName, func);
                func = null;
            };
            this.addListener(eventName, func, context);
        },

        /**
         * Fire an event
         *
         * @param {string} eventName
         * @param {Object} event data
         */
        fire: function (eventName, data) {
            if (!this.handlers[eventName]) {
                return;
            }

            var handlers = this.handlers[eventName];
            for (var i = 0, len = handlers.length; i < len; i++) {
                var handle = handlers[i][0];
                var context = handlers[i][1];
                handle.call(context, data);
            }
        }
    }


    /**
     * The Model
     *
     * @param {string} id
     * @param {string} todo
     * @param {number} priority
     * @param {string} period
     */
    function Model(id, todo, priority, period) {
        EventDisptcher.call(this);

        if (!id) {
            this.id = generateUUID();
        }

        this.todo = todo;
        this.priority = priority;
        this.period = period;
    }
    Model.prototype = Object.create(EventDisptcher.prototype);
    Model.prototype.constructor = Model;
    Model.prototype.get = function (property) {
        return this[property];
    };
    Model.prototype.set = function (property, value) {
        if (!(property in this)) {
            return;
        }

        var oldValue = this[property];
        this[property] = value;

        this.fire('update', {
            property: property,
            newValue: value,
            oldValue: oldValue
        });
    };
    Model.save = function () {
        var models = [];
        Model.models.forEach(function (model, i) {
            var obj = model.export();
            models.push(obj);
        });

        var obj = {
            models: models
        };
        var json = JSON.stringify(obj);
        localStorage.setItem(Model.storageKey, json);
    };
    Model.prototype.export = function () {
        var obj = {
            id: this.id,
            todo: this.todo,
            priority: this.priority,
            period: this.period
        };

        return obj;
    };
    Model.prototype.dispose = function () {
        localStorage.removeItem(this.id);
    };

    Model.load = function () {
        var json = localStorage.getItem(Model.storageKey);
        if (!json) {
            return null;
        }

        var result = [];
        var obj = JSON.parse(json);
        obj.models.forEach(function (data, i) {
            var model = new Model(data.id, data.todo, data.priority, data.period);
            result.push(model);
        });

        Model.models = [];
        Model.models = result;

        return result;
    };
    Model.create = function () {
        var model = new Model(null, '', 0, Model.getDate());
        Model.models.push(model);
        return model;
    };
    Model.getDate = function () {
        var date = new Date();
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        var day = date.getDate();
        return year + '/' + month + '/' + day;
    };

    Model.storageKey = 'todo';
    Model.models = [];

    /**
     * The View
     *
     * @param {Model} model
     */
    function View(model) {
        EventDisptcher.call(this);

        this.model = model;
        this.model.addListener('update', this.updateHandler.bind(this));

        this.init();
    }
    View.prototype = Object.create(EventDisptcher.prototype);
    View.prototype.constructor = View;
    View.prototype.init = function () {
        this.element = document.createElement('div');
        this.element.id = 'view-' + this.model.get('id');

        // todo
        this.todoElement = document.createElement('p');
        this.todoElement.className = 'todo-todo'
        this.todoElement.innerHTML = this.model.get('todo');

        // priority
        this.priorityElement = document.createElement('p');
        this.priorityElement.className = 'todo-priority';
        this.priorityElement.innerHTML = this.model.get('priority');
        
        // period
        this.periodElement = document.createElement('p');
        this.periodElement.className = 'todo-period';
        this.periodElement.innerHTML = this.model.get('period');

        // edit button
        this.editButton = document.createElement('input');
        this.editButton.type = 'button';
        this.editButton.value = 'Edit';
        this.editButton.addEventListener('click', this.editHandler.bind(this), false);

        // delete button
        this.deleteButton = document.createElement('input');
        this.deleteButton.type = 'button';
        this.deleteButton.value = 'Delete';
        this.deleteButton.addEventListener('click', this.deleteHandler.bind(this), false);

        this.element.appendChild(this.todoElement);
        this.element.appendChild(this.priorityElement);
        this.element.appendChild(this.periodElement);
        this.element.appendChild(this.editButton);
        this.element.appendChild(this.deleteButton);
    };
    View.prototype.updateHandler = function (args) {
        this.update();
    };
    View.prototype.update = function () {
        this.todoElement.innerHTML = this.model.get('todo');
        this.priorityElement.innerHTML = this.model.get('priority');
        this.periodElement.innerHTML = this.model.get('period');
    };
    View.prototype.editHandler = function (e) {
        console.log('On edit handler.');
        this.edit();
    };
    View.prototype.deleteHandler = function (e) {
        console.log('On delete handler.');

        this.delete();
    };
    View.prototype.delete = function () {
        this.model.dispose();
        this.element.parentNode.removeChild(this.element);
    };
    View.prototype.show = function () {
        this.element.style.display = 'block';
    };
    View.prototype.hide = function () {
        this.element.style.display = 'none';
    };
    View.prototype.edit = function () {
        this.fire('editmode', {
            id: this.model.get('id')
        });
    };


    function EditView(model) {
        EventDisptcher.call(this);

        this.model = model;

        this.init();
    }
    EditView.prototype = Object.create(EventDisptcher.prototype);
    EditView.prototype.constructor = EditView;
    EditView.prototype.init = function () {
        this.element = document.createElement('div');

        // todo
        this.todoInput = document.createElement('input');
        this.todoInput.type = 'input';
        this.todoInput.className = 'todo-todo'
        this.todoInput.value = this.model.get('todo');

        // priority
        this.priorityInput = document.createElement('input');
        this.priorityInput.type = 'input';
        this.priorityInput.className = 'todo-priority';
        this.priorityInput.value = this.model.get('priority');
        
        // period
        this.periodInput = document.createElement('input');
        this.periodInput.type = 'input';
        this.periodInput.className = 'todo-period';
        this.periodInput.value = this.model.get('period');

        // apply button
        this.applyButton = document.createElement('input');
        this.applyButton.type = 'button';
        this.applyButton.value = 'Apply';
        this.applyButton.addEventListener('click', this.applyHandler.bind(this), false);

        // cancel button
        this.cancelButton = document.createElement('input');
        this.cancelButton.type = 'button';
        this.cancelButton.value = 'Cancel';
        this.cancelButton.addEventListener('click', this.cancelHandler.bind(this), false);

        this.element.appendChild(this.todoInput);
        this.element.appendChild(this.priorityInput);
        this.element.appendChild(this.periodInput);
        this.element.appendChild(this.applyButton);
        this.element.appendChild(this.cancelButton);
    };
    EditView.prototype.applyHandler = function () {
        this.model.set('todo', this.todoInput.value);
        this.model.set('priority', this.priorityInput.value);
        this.model.set('period', this.periodInput.value);
        this.fire('finish', {
            id: this.model.get('id')
        });
    };
    EditView.prototype.cancelHandler = function () {
        this.fire('finish', {
            id: this.model.get('id')
        });
    };
    EditView.prototype.delete = function () {
        this.element.parentNode.removeChild(this.element);
    };


    /**
     * The Controller
     */
    function Controller() {
        this.addButton = document.getElementById('add-button');
        this.addButton.addEventListener('click', this.addTodoHandler.bind(this), false);

        this.saveButton = document.getElementById('save-button');
        this.saveButton.addEventListener('click', this.saveTodoHandler.bind(this), false);

        this.loadButton = document.getElementById('load-button');
        this.loadButton.addEventListener('click', this.loadTodoHandler.bind(this), false);
        
        this.container = document.getElementById('todo-list');

        this.views = [];
    }
    Controller.prototype = {
        constructor: Controller,

        addTodoHandler: function (e) {
            var model = Model.create();
            this.addTodo(model);
            this.edit(model.get('id'));
        },

        addTodo: function (model) {
            var view = new View(model);
            view.addListener('editmode', this.editHandler.bind(this));

            this.container.appendChild(view.element);

            this.views.push(view);
        },

        saveTodoHandler: function (e) {
            Model.save();
        },

        loadTodoHandler: function (e) {
            var models = Model.load();
            this.views.forEach(function (view, i) {
                view.delete();
            });
            this.views = [];

            models.forEach(function (model, i) {
                this.addTodo(model);
            }, this);
        },

        editHandler: function (args) {
            this.edit(args.id);
        },

        getViewById: function (id) {
            for (var i = 0, l = this.views.length; i < l; i++) {
                var view = this.views[i];
                if (~~view.element.id.indexOf(id) !== -1) {
                    return view;
                }
            }

            return null;
        },

        edit: function (id) {
            console.log('In edit mode for ' + id);

            var view = this.getViewById(id);
            view.hide();

            this.currentEditView = new EditView(view.model);
            this.currentEditView.addListener('finish', this.finishHandler.bind(this), false);
            this.container.insertBefore(this.currentEditView.element, view.element);
        },

        finishHandler: function (args) {
            this.finish(args.id);
        },

        finish: function (id) {
            this.currentEditView.delete();
            this.currentEditView = null;

            var view = this.getViewById(id);
            view.show();
        }
    };

    // Start App
    var controller = new Controller();


    // Exports
    ns.EventDisptcher = EventDisptcher;
    ns.Controller = Controller;
    ns.View = View;
    ns.Model = Model;

}(window));
