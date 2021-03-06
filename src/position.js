import { crel, css } from './dom';

export class PositionController {
    constructor(el, ft, options) {
        this.ft = ft;
        this.el = el;
        this.options = options;
        this.update();
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

    static getOffset(elem) {
        let offset = 0;
        do {
            offset += elem.offsetTop;
            elem = elem.offsetParent;
        } while (elem);
        return offset;
    }

    update() {
        // called on reflow
        this.tableOffset = PositionController.getOffset(this.el.table);
        this.headerHeight = this.ft.table.getBoundingClientRect().height;
    }

    //////// implement these 3 things
    init() {
        throw new Error('unimplemented');
    }

    getPosition(event) {
        // called on scroll and resize
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

    getPosition(target) {

        let top = 0;
        let left = 0;
        let position = 'above';

        const {top: tableTop, height: tableHeight} = this.el.table.getBoundingClientRect();
        const scrollTop = window.pageYOffset;

        if (tableTop < 0) {
            top = scrollTop - this.tableOffset;
            position = 'inside';
        }
        if (tableHeight - top - this.headerHeight <= 0) {
            position = 'below';
            top = tableHeight - this.headerHeight;
        }

        return {top, left, position};
    }
}

export class FixedPositionController extends PositionController {

    init() {

        //////////// dom element setup
        // maybe this isnt actaully needed?!
      //  this.el.table.insertAdjacentElement('afterend', this.ft.table);

        //////////// dom attribute setup
        this.ft.container.classList.add('fth-position-fixed');
    }

    static get name() {
        return 'fixed';
    }



    getPosition(target) {

        const {top: tableTop, left: tableLeft, bottom: tableBottom} = this.el.table.getBoundingClientRect();

        // TODO: this check can go outside of this class and into a super class or manager
        if (tableBottom < 0) {
            return {position: 'unfloat'}; //table above viewport
        }
        if (tableTop > window.innerHeight) {
            return {position: 'unfloat'}; //table below viewport
        }

        let top = 0;
        let left = tableLeft;
        let position = 'above';

        if (tableTop <= 0) {
            top = 0;
            position = 'inside';
        }
        if (tableTop > 0) {
            top = tableTop; //above the table
            position = 'unfloat';
        }

        const underTheTable = tableBottom - this.headerHeight;
        if (underTheTable <= 0) {
            position = 'below';
            top = underTheTable;
        }

        return {top, left, position};
    }
}
