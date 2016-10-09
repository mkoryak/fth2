import { crel, css } from './dom';

export class PositionController {
    constructor(el, ft, options) {
        this.ft = ft;
        this.el = el;
        this.options = options;
        this.init();
    }

    naturalOffset() {
        let offset = 0;
        let sibling = this.el.table.previousElementSibling;
        let parent = this.el.table.offsetParent;

        while (sibling) {
            offset += sibling.offsetHeight;
            sibling = sibling.previousElementSibling;
        }

        while (parent) {
            offset += parent.offsetTop;
            parent = parent.offsetParent;
        }

        return offset;
    };

    offset(elem) {
        let offset = 0;
        do {
            offset += elem.offsetTop;
            elem = elem.offsetParent;
        } while (elem);
        return offset;
    }

    //////// implement these 3 things
    init() {
        throw new Error('unimplemented');
    }

    getPosition(event) {
        throw new Error('unimplemented');
    }

    static get name() {
        throw new Error('unimplemented');
    }


}

export class AbsolutePositionController extends PositionController {

    init() {

        ////////////  dom element setup
        // this.wrapper = crel('fth-position-absolute-wrapper');
        // this.el.table.insertAdjacentElement('beforebegin', this.wrapper);

        // TODO: the question is, can i get away with not wrapping the table and just put the
        // wrapper above it? that would be nice.
        // this.wrapper.appendChild(this.el.table);

        // this.wrapper.appendChild(this.ft.container);

        //////////// dom attribute setup
        this.ft.container.classList.add('fth-position-absolute');


    }

    static get name() {
        return 'absolute';
    }


    getPosition(event) {
        if (event.type !== 'scroll') return;

        let target = event.currentTarget;
        target = target === document ? document.childNodes[0] : target;


        let top = 0;
        let left = 0;
        let floating = false;

        const {top: tableTop, height: tableHeight} = this.el.table.getBoundingClientRect();
        const scrollTop = window.pageYOffset;

        if (tableTop < 0) {
            top = scrollTop - this.offset(this.el.table);
            floating = true;
        }
        if (tableHeight - top < 0) { //TODO: subtract header height from tableHeight
            floating = false;
        }

        console.log('table top', top);
        console.log('scroll top', scrollTop);
        console.log('offset', this.offset(this.el.table));
        console.log('tableHeight', tableHeight);

        return {top, left, floating};
    }
}

export class FixedPositionController extends PositionController {

    init() {

        //////////// dom element setup
        this.el.table.insertAdjacentElement('afterend', this.ft.table);

        //////////// dom attribute setup
        this.ft.container.classList.add('fth-position-fixed');
    }

    static get name() {
        return 'fixed';
    }

    getPosition(event) {

    }
}
