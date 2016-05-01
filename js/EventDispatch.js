(function (ns) {

    'use strict';

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
    };

    // Exports
    ns.EventDisptcher = EventDisptcher;

}(window));
