(function(factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    }
    else if (typeof exports === 'object') {
        // CommonJS
        module.exports = factory();
    } else {
        // Browser globals
        window.rangeslider = factory();
    }
}(function() {
    'use strict';

    /**
     * Range feature detection
     * @return {Boolean}
     */
    function supportsRange() {
        var input = document.createElement('input');
        input.setAttribute('type', 'range');
        return input.type !== 'text';
    }

    function noop () {}

    var inputrange = supportsRange(),
        rangeId = 'rangeslider',
        defaults = {
            polyfill: true,
            rangeClass: 'rangeslider',
            disabledClass: 'rangeslider--disabled',
            fillClass: 'rangeslider__fill',
            handleClass: 'rangeslider__handle',
            startEvent: ['mousedown', 'touchstart', 'pointerdown'],
            moveEvent: ['mousemove', 'touchmove', 'pointermove'],
            endEvent: ['mouseup', 'touchend', 'pointerup'],
            changeEvent: ['change', 'input'],
            onInit: noop,
            onSlide: noop,
            onSlideEnd: noop
        };

    /**
     * Check if a `element` is visible in the DOM
     *
     * @param  {Element}  element
     * @return {Boolean}
     */
    function isHidden(element) {
        return (
            element && (
                element.offsetWidth === 0 ||
                element.offsetHeight === 0 ||
                // Also Consider native `<details>` elements.
                element.open === false
            )
        );
    }

    /**
     * Get hidden parentNodes of an `element`
     *
     * @param  {Element} element
     * @return {[type]}
     */
    function getHiddenParentNodes(element) {
        var parents = [],
            node    = element.parentNode;

        while (isHidden(node)) {
            parents.push(node);
            node = node.parentNode;
        }
        return parents;
    }

    /**
     * Applies a list of styles to an element.
     * @param  {Node} element
     * @param  {Object} styles
     */
    function applyStyle(element, styles) {
        for (var key in styles) {
            element.style[key] = styles[key];
        }
    }

    /**
     * Returns dimensions for an element even if it is not visible in the DOM.
     *
     * @param  {Element} element
     * @param  {String}  key     (e.g. offsetWidth …)
     * @return {Number}
     */
    function getDimension(element, key) {
        var hiddenParentNodes       = getHiddenParentNodes(element),
            hiddenParentNodesLength = hiddenParentNodes.length,
            inlineStyle             = [],
            dimension               = element[key];

        // Used for native `<details>` elements
        function toggleOpenProperty(element) {
            if (typeof element.open !== 'undefined') {
                element.open = (element.open) ? false : true;
            }
        }

        if (hiddenParentNodesLength) {
            for (var i = 0; i < hiddenParentNodesLength; i++) {

                // Cache style attribute to restore it later.
                inlineStyle[i] = hiddenParentNodes[i].style.cssText;

                // visually hide
                applyStyle(hiddenParentNodes[i], {
                    display: 'block',
                    height: '0',
                    overflow: 'hidden',
                    visibility: 'hidden'
                });
                toggleOpenProperty(hiddenParentNodes[i]);
            }

            // Update dimension
            dimension = element[key];

            for (var j = 0; j < hiddenParentNodesLength; j++) {

                // Restore the style attribute
                hiddenParentNodes[j].style.cssText = inlineStyle[j];
                toggleOpenProperty(hiddenParentNodes[j]);
            }
        }
        return dimension;
    }

    /**
     * Extends objects atop one another.
     * @param {Object...} objs
     * @return {Object}
     */
    function extend() {
        for (var i = 1; i < arguments.length; i++) {
            var arg = arguments[i];
            if (!arg) {
                continue;
            }

            for (var key in arg) {
                arguments[0][key] = arg[key];
            }
        }

        return arguments[0];
    }

    /**
     * Un/Listens to many events on the object, dispatching
     * them to the function.
     * @param  {Node}     obj
     * @param  {[]String} events
     * @param  {Function} fn
     */
    function listen(obj, events, fn) {
        events.forEach(function (ev) {
            obj.addEventListener(ev, fn);
        });
    }
    function unlisten(obj, events, fn) {
        events.forEach(function (ev) {
            obj.removeEventListener(ev, fn);
        });
    }

    /**
     * Creates a new element with the given tag and attributes.
     *
     * @param  {String} tag
     * @param  {Object.<String, *>} attrs
     * @return {Node}
     */
    function createEl (tag, attrs) {
        var e = document.createElement(tag);
        for (var key in attrs) {
            e.setAttribute(key, attrs[key]);
        }
        return e;
    }

    /**
     * Checks if a value is undefined (abstracted for minification).
     * @param  {*}  val
     * @return {Boolean}
     */
    function isUndefined (val) {
        return val === undefined;
    }

    /**
     * Restricts a value between a min and a max.
     * @param  {Number} pos
     * @param  {Number} min
     * @param  {Number} max
     * @return {Number}
     */
    function cap (pos, min, max) {
        if (pos < min) { return min; }
        if (pos > max) { return max; }
        return pos;
    }

    return function (element, options) {
        options = extend({}, defaults, options);

        // If plugin should only be used as a polyfill and we
        // have range support, don't do anything.
        if (options.polyfill && inputrange) {
            return;
        }

        // Add in the elements
        var range  = createEl('div', { class: options.rangeClass }, 'afterend');
        var handle = createEl('div', { class: options.handleClass });
        var fill   = createEl('div', { class: options.fillClass });

        range.appendChild(fill);
        range.appendChild(handle);
        element.parentNode.insertBefore(range, element);

        var grabX, maxHandleX, handleWidth, max, min, step,
            oldValue, position, rangeWidth, toFixed;

        // visually hide the input
        applyStyle(element, {
            position: 'absolute',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            opacity: '0'
        });

        function update (updateAttributes) {
            if (updateAttributes === true) {
                min      = parseFloat(element.getAttribute('min') || 0);
                max      = parseFloat(element.getAttribute('max') || 100);
                oldValue = parseFloat(element.value || min + (max-min)/2);
                step     = parseFloat(element.getAttribute('step') || 1);
            }

            handleWidth    = getDimension(handle, 'offsetWidth');
            rangeWidth     = getDimension(range, 'offsetWidth');
            maxHandleX     = rangeWidth - handleWidth;
            grabX          = handleWidth / 2;
            position       = getPositionFromValue(oldValue);
            toFixed        = (step + '').replace('.', '').length - 1;

            // Consider disabled state
            if (element.disabled) {
                range.classList.add(options.disabledClass);
            } else {
                range.classList.remove(options.disabledClass);
            }

            setPosition(position);
        }

        function handleMove (e) {
            e.preventDefault();
            var posX = getRelativePosition(e);
            setPosition(posX - grabX);
        }

        function handleEnd (e) {
            if (e) {
                e.preventDefault();
            }
            unlisten(document, options.moveEvent, handleMove);
            unlisten(document, options.endEvent, handleEnd);

            options.onSlideEnd(position, oldValue);
        }

        function getRelativePosition (e) {
            // Get the offset left relative to the viewport
            var rangeX  = range.getBoundingClientRect().left,
                pageX   = 0;

            if (!isUndefined(e.pageX)) {
                pageX = e.pageX;
            }
            else if (!isUndefined(e.clientX)) {
                pageX = e.clientX;
            }
            else if (e.touches && e.touches[0] && !isUndefined(e.touches[0].clientX)) {
                pageX = e.touches[0].clientX;
            }
            else if (e.currentPoint && !isUndefined(e.currentPoint.x)) {
                pageX = e.currentPoint.x;
            }

            return pageX - rangeX;
        }

        function getPositionFromNode (node) {
            var i = 0;
            while (node !== null) {
                i += node.offsetLeft;
                node = node.offsetParent;
            }
            return i;
        }

        function getPositionFromValue (value) {
            var percentage, pos;
            percentage = (value - min)/(max - min);
            pos = percentage * maxHandleX;
            return pos;
        }

        function getValueFromPosition (pos) {
            var percentage, value;
            percentage = ((pos) / (maxHandleX || 1));
            value = step * Math.round(percentage * (max - min) / step) + min;
            return +(value).toFixed(toFixed);
        }

        function setPosition (pos, omitEv) {
            var value, left;

            // Snapping steps
            value = getValueFromPosition(cap(pos, 0, maxHandleX));
            left = getPositionFromValue(value);

            // Update ui
            fill.style.width = (left + grabX) + 'px';
            handle.style.left = left + 'px';
            setValue(value, omitEv);

            // Update globals
            position = left;
            oldValue = value;

            options.onSlide(left, value);
        }

        function setValue (value, omitEv) {
            if (value === oldValue) {
                return;
            }

            // Set the new value and fire the `input` event
            element.value = value;

            if (!omitEv) {
                options.changeEvent.forEach(function (name) {
                    var event = document.createEvent('HTMLEvents');
                    event.initEvent(name, true, true);
                    event.origin = rangeId;
                    element.dispatchEvent(event);
                });
            }
        }

        function handleChange (e) {
            // Ignore events triggered by the slider itself.
            if (e.origin === rangeId) {
                return;
            }

            var pos = getPositionFromValue(element.value);
            setPosition(pos, true);
        }

        function destroy() {
            handleEnd();
            window.removeEventListener('resize', update);
            unlisten(element, options.changeEvent, handleChange);
            element.removeAttribute('style');
            range.parentNode.removeChild(range);
        }


        window.addEventListener('resize', update);
        listen(element, options.changeEvent, handleChange);

        listen(range, options.startEvent, function (e) {
            e.preventDefault();
            if (element.disabled) {
                return;
            }

            listen(document, options.moveEvent, handleMove);
            listen(document, options.endEvent, handleEnd);

            var posX    = getRelativePosition(e),
                rangeX  = element.getBoundingClientRect().left,
                handleX = getPositionFromNode(handle) - rangeX;

            setPosition(posX - grabX);

            if (posX >= handleX && posX < handleX + handleWidth) {
                grabX = posX - handleX;
            }
        });


        update(true);

        // Set initial value just in case it is not set already.
        // Prevents trouble if we call `update(true)`
        element.value = oldValue;
        options.onInit();

        return { update: update, destroy: destroy };
    };
}));
