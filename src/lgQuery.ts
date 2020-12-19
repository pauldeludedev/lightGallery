interface Offset {
    left: number;
    top: number;
}

(function () {
    if (typeof window.CustomEvent === 'function') return false;

    function CustomEvent(event: string, params: any) {
        params = params || { bubbles: false, cancelable: false, detail: null };
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(
            event,
            params.bubbles,
            params.cancelable,
            params.detail,
        );
        return evt;
    }

    window.CustomEvent = CustomEvent as any;
})();
(function () {
    if (!Element.prototype.matches) {
        Element.prototype.matches =
            (Element.prototype as any).msMatchesSelector ||
            Element.prototype.webkitMatchesSelector;
    }
})();
export class lgQuery {
    static eventListeners: { [key: string]: any[] } = {};
    private selector: any;
    private firstElement: any;
    private cssVenderPrefixes: string[] = [
        'TransitionDuration',
        'TransitionTimingFunction',
        'Transform',
        'Transition',
    ];
    constructor(selector: string | Element) {
        this.selector = this._getSelector(selector);
        this.firstElement = this._getFirstEl();
        return this;
    }

    static param(obj: { [x: string]: string | number | boolean }): string {
        return Object.keys(obj)
            .map(function (k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
            })
            .join('&');
    }

    private _getSelector(
        selector: string | Element,
        context: Element | Document = document,
    ): Element | null | NodeListOf<Element> {
        if (typeof selector !== 'string') {
            return selector;
        }
        context = context || document;
        const fl = selector.substring(0, 1);
        if (fl === '#') {
            return context.querySelector(selector);
        } else {
            return context.querySelectorAll(selector);
        }
    }

    private _each(
        func: (
            elements: Element | NodeListOf<Element> | null,
            index: number,
        ) => void,
    ): this {
        if (!this.selector) {
            return this;
        }
        if (this.selector.length !== undefined) {
            [].forEach.call(this.selector, func);
        } else {
            func(this.selector, 0);
        }
        return this;
    }

    private _setCssVendorPrefix(
        el: any,
        cssProperty: string,
        value?: string | number,
    ): void {
        const property = cssProperty.replace(/-([a-z])/gi, function (
            s,
            group1,
        ) {
            return group1.toUpperCase();
        });
        if (this.cssVenderPrefixes.indexOf(property) !== -1) {
            el.style[
                property.charAt(0).toLowerCase() + property.slice(1)
            ] = value;
            el.style['webkit' + property] = value;
            el.style['moz' + property] = value;
            el.style['ms' + property] = value;
            el.style['o' + property] = value;
        } else {
            el.style[property] = value;
        }
    }

    private _getFirstEl() {
        if (this.selector && this.selector.length !== undefined) {
            return this.selector[0];
        } else {
            return this.selector;
        }
    }

    attr(attr: string): string;
    attr(attr: string, value: string | number): this;
    attr(attr: string, value?: string | number): string | this {
        if (value === undefined) {
            if (!this.firstElement) {
                return '';
            }
            return this.firstElement.getAttribute(attr);
        }
        this._each((el: any) => {
            el.setAttribute(attr, value);
        });
        return this;
    }

    find(selector: any): lgQuery {
        return LG(this._getSelector(selector, this.selector));
    }

    first(): lgQuery {
        if (this.selector.length !== undefined) {
            return LG(this.selector[0]);
        } else {
            return LG(this.selector);
        }
    }

    eq(index: number): lgQuery {
        return LG(this.selector[index]);
    }

    parent(): lgQuery {
        return LG(this.selector.parentElement);
    }

    get() {
        return this.selector;
    }

    removeAttr(attr: string): this {
        this._each((el: any) => {
            el.removeAttribute(attr);
        });
        return this;
    }

    wrap(className: string): this {
        if (!this.firstElement) {
            return this;
        }
        const wrapper = document.createElement('div');
        wrapper.className = className;
        this.firstElement.parentNode.insertBefore(wrapper, this.firstElement);
        this.firstElement.parentNode.removeChild(this.firstElement);
        wrapper.appendChild(this.firstElement);
        return this;
    }

    addClass(classNames = ''): this {
        this._each((el: any) => {
            // IE doesn't support multiple arguments
            classNames.split(' ').forEach((className) => {
                el.classList.add(className);
            });
        });
        return this;
    }

    removeClass(classNames: string): this {
        this._each((el: any) => {
            // IE doesn't support multiple arguments
            classNames.split(' ').forEach((className) => {
                el.classList.remove(className);
            });
        });
        return this;
    }

    hasClass(className: string): boolean {
        if (!this.firstElement) {
            return false;
        }
        return this.firstElement.classList.contains(className);
    }
    hasAttribute(attribute: string): boolean {
        if (!this.firstElement) {
            return false;
        }
        return this.firstElement.hasAttribute(attribute);
    }
    toggleClass(className: string): this {
        if (!this.firstElement) {
            return this;
        }
        if (this.hasClass(className)) {
            this.removeClass(className);
        } else {
            this.addClass(className);
        }
        return this;
    }

    css(property: string, value?: string | number): this {
        this._each((el: any) => {
            this._setCssVendorPrefix(el, property, value);
        });
        return this;
    }
    // Need to pass separate namespaces for separate elements
    on(events: string, listener: (e: any) => void): this {
        if (!this.selector) {
            return this;
        }
        events.split(' ').forEach((event: string) => {
            if (!Array.isArray(lgQuery.eventListeners[event])) {
                lgQuery.eventListeners[event] = [];
            }
            lgQuery.eventListeners[event].push(listener);
            this.selector.addEventListener(event.split('.')[0], listener);
        });

        return this;
    }
    off(event: string): this {
        if (!this.selector || !Array.isArray(lgQuery.eventListeners[event])) {
            return this;
        }
        lgQuery.eventListeners[event].forEach((listener) => {
            this.selector.removeEventListener(event.split('.')[0], listener);
        });
        lgQuery.eventListeners[event] = [];
        return this;
    }
    trigger(event: string, detail?: any): this {
        if (!this.firstElement) {
            return this;
        }

        const customEvent = new CustomEvent(event.split('.')[0], {
            detail: detail || null,
        });
        this.firstElement.dispatchEvent(customEvent);
        return this;
    }

    // Does not support IE
    load(url: string): this {
        fetch(url).then((res) => {
            this.selector.innerHTML = res;
        });
        return this;
    }

    html(): string;
    html(html: string): this;
    html(html?: string): string | this {
        if (html === undefined) {
            if (!this.firstElement) {
                return '';
            }
            return this.firstElement.innerHTML;
        }
        this._each((el: any) => {
            el.innerHTML = html;
        });
        return this;
    }
    append(html: string | HTMLElement): this {
        this._each((el: any) => {
            if (typeof html === 'string') {
                el.insertAdjacentHTML('beforeend', html);
            } else {
                el.appendChild(html);
            }
        });
        return this;
    }
    prepend(html: string): this {
        this._each((el: any) => {
            el.insertAdjacentHTML('afterbegin', html);
        });
        return this;
    }
    remove(): this {
        this._each((el: any) => {
            el.parentNode.removeChild(el);
        });
        return this;
    }
    empty(): this {
        this._each((el: any) => {
            el.innerHTML = '';
        });
        return this;
    }
    // Supports only window
    scrollTop(): number;
    scrollTop(scrollTop: number): this;
    scrollTop(scrollTop?: number): number | this {
        if (scrollTop !== undefined) {
            document.body.scrollTop = scrollTop;
            document.documentElement.scrollTop = scrollTop;
            return this;
        } else {
            return (
                window.pageYOffset ||
                document.documentElement.scrollTop ||
                document.body.scrollTop ||
                0
            );
        }
    }
    // Supports only window
    scrollLeft(): number;
    scrollLeft(scrollLeft?: number): this;
    scrollLeft(scrollLeft?: number): number | this {
        if (scrollLeft !== undefined) {
            document.body.scrollLeft = scrollLeft;
            document.documentElement.scrollLeft = scrollLeft;
            return this;
        } else {
            return (
                window.pageXOffset ||
                document.documentElement.scrollLeft ||
                document.body.scrollLeft ||
                0
            );
        }
    }
    offset(): Offset {
        if (!this.firstElement) {
            return {
                left: 0,
                top: 0,
            };
        }
        const rect = this.firstElement.getBoundingClientRect();
        return {
            left: rect.left + this.scrollLeft(),
            top: rect.top + this.scrollTop(),
        };
    }
    style(): CSSStyleDeclaration {
        if (!this.firstElement) {
            return {} as CSSStyleDeclaration;
        }
        return (
            this.firstElement.currentStyle ||
            window.getComputedStyle(this.firstElement)
        );
    }
    // Width without padding and border even if box-sizing is used.
    width(): number {
        const style = this.style();
        return (
            this.firstElement.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight)
        );
    }
    // Height without padding and border even if box-sizing is used.
    height(): number {
        const style = this.style();
        return (
            this.firstElement.clientHeight -
            parseFloat(style.paddingTop) -
            parseFloat(style.paddingBottom)
        );
    }
}

export function LG(selector: any): lgQuery {
    return new lgQuery(selector);
}
