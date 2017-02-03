import { StyleSheet, css, outerWidth, fps, iter, crel } from './dom';
import { FloatTable, Table } from './table';
import { AbsolutePositionController, FixedPositionController } from './position';


const style = new StyleSheet();


const $controllers = Symbol();

style.add('fth-tfoot', {
    'display': 'table-footer-group',
    'border-spacing': 0,
    'height': 0
});

style.add('fth-tr', {
    'display': 'table-row',
    'border-spacing': 0,
    'height': 0,
    'border-collapse': 'collapse'
});

style.add('fth-td', {
    'display': 'table-cell',
    'height': 0,
    'width': 'auto'
});

//the element containing the floating table/header
style.add('fth-container', {
    'display': 'block',
    'margin-top': 0,
    'overflow': 'auto',
    'will-change': 'transform',
    'z-index': 1001 //should come from options
});

style.add('fth-container.fth-position-fixed', {
    'position': 'fixed',
    'top': '0',
    'left': '0'
});

style.add('fth-container.fth-position-absolute', {
    'position': 'absolute',
    // 'top': 0,
    // 'left': 0
});

style.add('fth-position-absolute-wrapper', {
    'position': 'relative',
    'display': 'block'
});










/*
The thought here is that i will have 2 classes, the table class will have refs to its
header, and the 2 elements ill use for sizing - the <col> elements are the ones that have the size
set of them, and the fth-foot > * elements is where we read teh sizes.

the "original" table where the plugin will run will have a Table instance and it will be used to get
the sizes of columns, table width, header height. This is our source of truth

the floating table will have a FloatingTable instance and it will initialize the same as the Table
instance but it will also contain the sizing header. it will have no body.

there will be some other driver will swap the headers between the 2 tables and also resize the the
floating table columns to be same widths as the original table. as well as the table's width, and
the sizing row (.fth-placeholder).

we will also need a driver to position the floating table properly for us and do all the other
things that will make this plugin great again!

*/

class TableController {
    constructor(el, options) {
        this.options = options;

        this.el = new Table(el, options); //create api for original table

        // floatTable must be inserted into the dom in order to init itself properly.
        const floatTable = crel('table');
        this.el.table.insertAdjacentElement('beforebegin', floatTable);
        this.ft = new FloatTable(floatTable, this.el.columnCount, options);

        this.floating = false;

        const controllerCls = FloatThead.controllerFor(options.position);
        this.controller = new controllerCls(this.el, this.ft, this.options);


        this.render = fps(this.render.bind(this));

        this.last = {
            top: null,
            left: null,
            position: null
        }
    }

    floatHeader() {
        const layoutFixed = {'table-layout': 'fixed'};

        if (!this.floating) {
            this.floating = true;

            css(this.el.table, layoutFixed);
            css(this.ft.table, layoutFixed);

            this.ft.setHeaderHeight(this.el.getHeaderHeight());

            // move placeholder thead into original table
            this.el.setHeader(this.ft.head);
            // move real thead into floating table, colgroup must be first
            this.ft.setHeader(this.el.head);
        }
        return this;
    }

    unfloatHeader() {
        const layoutOriginal = {'table-layout': this.el.originalStyle['table-layout']};
        const minWidth = this.el.originalStyle['min-width'];
        if (this.floating) {
            this.floating = false;

            // move placeholder thead back into floating table
            this.ft.setHeader(this.ft.head);
            // move real thead back into original table
            this.el.setHeader(this.el.head);

            this.el.resetColumns();
            this.ft.resetColumns();

            css(this.el.table, layoutOriginal);
            css(this.ft.table, layoutOriginal);

            minWidth && css(this.el.table, {'min-width': minWidth});
        }
        return this;
    }

    syncColumns() {
        const nowFloating = this.floating;
        if (nowFloating) {
            this.unfloatHeader();
        }

        this.ft.columnCount = this.el.updateColumnCount();
        // you get widths from one element and set them on another, which is why this looks
        // kind of weird.
        const widths = this.el.getColumnWidths();

        this.ft.setWidth(this.el.tableWidth);
        this.ft.setColumnWidths(widths);
        this.el.setColumnWidths(widths);


        if (nowFloating) {
            this.floatHeader();
        }
        return this;
    }

    reflow() {
        this.syncColumns();
        this.controller.update();
        const currentTarget = this.scrollContainer ? this.scrollContainer : document;
        this.updatePosition({type: 'reflow', currentTarget});
    }

    //this function is running inside of requestAnimationFrame, it cannot return anything
    render(event) {
        const pos = this.controller.getPosition(event);

        if (this.last.top === pos.top && this.last.left === pos.left) {
            return;
        }
        const {top, left, position} = this.last = pos;

  //      console.log('2pos is (left, top):', left, top, position);

        const transform = `translateX(${ left }px) translateY(${ top }px)`;
        css(this.ft.container, {
            '-webkit-transform' : transform,
            '-moz-transform'    : transform,
            '-ms-transform'     : transform,
            '-o-transform'      : transform,
            'transform'         : transform
        });
    }

    updatePosition(event) {
  //      console.log('1pos is (left, top):');
        this.render(event);
    }

    handleEvent(event) {

        switch (event.type){
            case 'resize':
                this.syncColumns();
            case 'scroll':
                this.updatePosition(event);
        }
    }
}


export default class FloatThead {
    constructor(el, opts={}) {
        const options = Object.assign({}, FloatThead.defaultOptions, opts);
        console.log('opts', options)
        // if (options.scrollContainer === true) {
        //     options.scrollContainer = getClosestScrollContainer;
        // }

        if (el.classList.contains(options.floatTableClass)){
            return this.el;
        }

        this.el = el;

        this.options = options;

        this.scrollContainer = this.options.scrollContainer(this.el);


        if (this.scrollContainer && this.options.position === 'auto') {
            this.options.position = 'absolute';
        }



        //TODO: resolve position: 'auto' into absolute or fixed


        this.manager = new TableController(this.el, this.options);


        document.addEventListener('scroll', this.manager, false);
        window.addEventListener('resize', this.manager, false);

        if (this.scrollContainer) {
            window.addEventListener('scroll', this.manager, false);
        }

        setTimeout(() => {
            this.manager.syncColumns().floatHeader();
        }, 1000)

    }

    static registerPositionController(clazz){
        this[$controllers][clazz.name] = clazz;
    }

    static controllerFor(positionName) {
        return this[$controllers][positionName];
    }



    refloat() { //make the thing float

        if(this.options.position === 'absolute'){ //#53, #56
            const tw = outerWidth(this.el);
            const wrapperWidth = 500; //TODO: $wrapper.width();
            if(tw > wrapperWidth){
                css(this.el, {'minWidth': tw});
            }
        }


        this.floatTable.makeFloat();

    }

}


FloatThead.defaultOptions = { //TODO: need to use object.assign here, this dont worky
    headerCellSelector: 'tr:visible:first>*:visible', //thead cells are this.
    zIndex: 1001, //zindex of the floating thead (actually a container div)
    position: 'auto', // 'fixed', 'absolute', 'auto'. auto picks the best for your table scrolling type.
    top: 0, //String or function($table) - offset from top of window where the header should not pass above
    bottom: 0, //String or function($table) - offset from the bottom of the table where the header should stop scrolling
    scrollContainer: function(table) { // or boolean 'true' (use offsetParent) | function -> if the table has horizontal scroll bars then this is the container that has overflow:auto and causes those scroll bars
      return null;
    },
    responsiveContainer: function(table) { // only valid if scrollContainer is not used (ie window scrolling). this is the container which will control y scrolling at some mobile breakpoints
      return null;
    },
    getSizingRow: function($table, $cols, $fthCells){ // this is only called when using IE,
      // override it if the first row of the table is going to contain colgroups (any cell spans greater than one col)
      // it should return a jquery object containing a wrapped set of table cells comprising a row that contains no col spans and is visible
      return $table.find('tbody tr:visible:first>*:visible');
    },
    floatTableClass: 'fth-table',
    floatWrapperClass: 'fth-wrapper',
    floatContainerClass: 'fth-container',
//    copyTableClass: true, //copy 'class' attribute from table into the floated table so that the styles match.
    enableAria: false //will copy header text from the floated header back into the table for screen readers. Might cause the css styling to be off. beware!
//    autoReflow: false, //(undocumented) - use MutationObserver api to reflow automatically when internal table DOM changes
};

FloatThead[$controllers] = {};
FloatThead.registerPositionController(AbsolutePositionController);
FloatThead.registerPositionController(FixedPositionController);
