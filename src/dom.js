const doc = document;
const win = window;
const body = document.body;

export const iter = (arr) => Array.prototype.slice.call(arr);
export const crel = (name) => document.createElement(name);

export class StyleSheet {
    constructor() {
        const styleElem = document.createElement('style');

        styleElem.type  = 'text/css';
        styleElem.id    = 'fth-styles';

        doc.head.appendChild(styleElem);

        this.sheet = styleElem.sheet;
    }

    static stringify(selector, rules) {
        return `${ selector } {\n${
            Object.keys(rules)
                .map(key => `${ key }: ${ rules[key] };`)
                .join('\n')
        }\n}`;
    }

    add(selector, rules) {
        const str = StyleSheet.stringify(selector, rules);
        this.sheet.insertRule(str, this.sheet.cssRules.length);
    }
}


export const fps = (fn) => {
    let triggered = false;
    let lastArgs = [];

    const act = () => {
        triggered = false;
        fn(...lastArgs);
    };

    return (...args) => {
        lastArgs = args;
        if (!triggered) {
            triggered = true;
            window.requestAnimationFrame(act);
        }
    };
};

export const scrollbarWidth = () => {
    const d = document.createElement("scrolltester");
    d.style.cssText = 'width:100px;height:100px;overflow:scroll!important;position:absolute;top:-9999px;display:block';
    body.appendChild(d);
    const result = d.offsetWidth - d.clientWidth;
    body.removeChild(d);
    return result;
};

export const parseHTML = (str) => {
    const frag = doc.createDocumentFragment();
    const tmp = frag.appendChild(doc.createElement('div'));
    tmp.outerHTML = str;
    return tmp;
};

export const is = (el, selector) => {
    return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector);
};

export const css = (el, arg) => {
    if (!arg) {
        return getComputedStyle(el);
    } else if (typeof arg === 'string') {
        return getComputedStyle(el)[arg];
    } else { //its an object setting css props - that's all ill support :)
        Object.keys(arg).forEach(key => el.style[key] = arg[key]);
    }
};

export const outerWidth = (el) => {
    const {marginLeft, marginRight} = css(el);
    return el.offsetWidth + parseInt(marginLeft) + parseInt(marginRight);
};

/*
This is a really simple dom helper with stuff I need. It doesn't even support working with multiple elements
 */
export class $ {
    constructor(el) {
        if (el instanceof $) {
            return el;
        } else if (typeof el === 'string' && el[0] === '<') {
            const frag = doc.createDocumentFragment();
            const tmp = frag.appendChild(doc.createElement("div"));
            tmp.innerHTML = el;
            this._ = tmp.children[0];
        } else {
            this._ = el;
        }
        this.parentNode = this._.parentNode;
    }



    filter(selector) {
        Array.prototype.filter.call(this._, selector instanceof Function ?
            selector :
            el => $(el).is(selector)
        );
    }

    find(selector) {
        return $(this._.querySelector(selector));
    }

    getBoundingClientRect() {
        return this._.getBoundingClientRect();
    }

    offset() {
        var html = doc.documentElement;
        var box = this.getBoundingClientRect();

        return {
          left: box.left + (win.scrollX || html.scrollLeft) - html.clientLeft,
          top: box.top + (win.scrollY || html.scrollTop) - html.clientTop
        };
    }

    width() {
        const rect = this.getBoundingClientRect();
        return rect.right - rect.left;
    };

    height() {
        const rect = this.getBoundingClientRect();
        return rect.top - rect.bottom;
    };

    closest(fn) {
        let parent = this._.parentElement;

        do {
            if (fn.apply(this._, [parent])) {
                break;
            }

        } while (parent = parent.parentElement);

        if(parent == body){
            return null;
        }
        return $(parent);
    };

    closestScrollParent() {
        return this.closest((parent) => {
            var pos = win
                .getComputedStyle(parent)
                .getPropertyValue('overflow');

            if (pos !== 'visible') {
                return true;
            }
        });
    }

    // NEEDED:

    append(el) {
        return this._.appendChild(el._ || el);
    }

    prepend(el) {

    }

    before(el) {

    }

    after(el) {

    }

    data(obj) {

    }

    attr(obj) {

    }

    css(obj) {

    }

}
