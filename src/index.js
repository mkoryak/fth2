import { $, parseHTML, StyleSheet, css, outerWidth } from './dom';

const style = new StyleSheet();
const iter = (arr) => Array.prototype.slice.call(arr);

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
    'z-index': 1001 //should come from options
});

style.add('fth-container.fth-position-fixed', {
    'position': 'fixed',
    'top': 'auto'
});

style.add('fth-container.fth-position-absolute', {
    'position': 'absolute',
    'top': 0,
    'left': 0
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

class ColumnTable {
    constructor(table, columnCount, options) {
        this.table = table;
        this.opts = options;

        table.insertAdjacentHTML('beforeend', '<fth-tfoot><fth-tr></fth-tr></fth-tfoot>');
        table.insertAdjacentHTML('afterbegin', '<colgroup></colgroup>');

        this.write = this.table.querySelector('colgroup');
        this.read = this.table.querySelector('fth-tfoot > fth-tr');

        this.columnCount = columnCount;
        this.resetColumns();
    }

    getColumnWidths() {
        return iter(this.read.children).map(node => {
            const rect = node.getBoundingClientRect();
            return rect.right - rect.left;
        });
    }

    setColumnWidths(arr) {
        // do it all at once to reduce redraws required
        this.write.innerHTML = arr.map(width => `<col style='width: ${width}px'/>`).join('');
    }

    resetColumns() {
        this.write.innerHTML = '<col/>'.repeat(this.columnCount);
        this.read.innerHTML = '<fth-td></fth-td>'.repeat(this.columnCount);
    }

    setHeader(header) {
        this.write.insertAdjacentElement('afterend', header);
    }
}

class Table extends ColumnTable {
    constructor(table, opts) {
        table.classList.add(opts.floatTableClass);

        this.head = table.querySelector('thead');

        this.originalStyle = {
            'table-layout': css(table, 'table-layout') || 'auto',
            'min-width':    css(table, 'min-width')
        };

        this.updateColumnCount();
        super(table, this.columnCount, this.opts);
        // this.opts = ...
        // this.table = ...
        // this.read = ...
        // this.write = ...
        // this.columnCount = ...
    }

    updateColumnCount() {
        const cells = this.head.children[0] && this.head.children[0].children;
        if (!cells) {
            return 0;
        }
        this.columnCount = iter(cells).reduce(function (acc, cell) {
            return acc + parseInt(cell.getAttribute('colspan') || 1);
        }, 0);
        return this.columnCount;
    }

    getHeaderHeight() {
        let headerHeight = iter(this.head.children)
            .filter(cell => cell.nodeName === 'TR' && cell.offsetWidth)
            .reduce((acc, cell) => {
                return acc + cell.offsetHeight;
            }, 0);

        if (css(this.table, 'border-collapse') === 'collapse') {
            const tableBorderTopHeight = parseInt(css(this.table, 'border-top-width'));
            const firstCell = this.head.children[0].children[0];
            const cellBorderTopHeight = parseInt(css(firstCell, 'border-top-width'));
            if(tableBorderTopHeight > cellBorderTopHeight) {
                headerHeight -= (tableBorderTopHeight / 2);
            }
        }
        return headerHeight;
    }

}

class FloatTable extends ColumnTable {
    constructor(table, columnCount, opts) {

        this.container = document.createElement('fth-container');
        this.container.setAttribute('aria-hidden', 'true');
        this.container.classList.add(`fth-position-${opts.position === 'fixed' ? 'fixed' : 'absolute'}`);

        //wrap the table in a container
        table.insertAdjacentElement('beforebegin', this.container);
        this.container.appendChild(table);
        
        table.createTHead().insertAdjacentHTML('beforeend', '<fth-tr class="fth-placeholder"></fth-tr>');

        this.head = table.querySelector('thead');

        this.headerHeight = null;

        super(table, columnCount, opts);
        // this.opts = ...
        // this.table = ...
        // this.read = ...
        // this.write = ...
        // this.columnCount = ...
    }


    resetColumns() {
        const hh = (this.headerHeight && this.headerHeight + 'px') || '';
        this.head.querySelector('fth-tr.fth-placeholder').innerHTML =
            `<fth-td style='height: ${ hh }'></fth-td>`.repeat(this.columnCount);
        super.resetColumns();
    }

    setHeaderHeight(height) {
        this.headerHeight = height;

        const placeholderRow = this.head.querySelector('fth-tr.fth-placeholder');
        placeholderRow.style.height = `${ height }px`;
        placeholderRow.innerHTML =
            `<fth-td style='height: ${ this.headerHeight }px'></fth-td>`.repeat(this.columnCount);
    }

    // i am not sure this method should live here or that this class should know about this.$

}

class TableManager {
    constructor(el, options) {
        this.opts = options;

        this.el = new Table(el, options); //create api for original table

        this.el.table.insertAdjacentHTML('afterend', `<table></table>`); //create float table

        this.ft = new FloatTable(this.el.table.nextElementSibling, this.el.columnCount, options);

        this.floating = false;
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

        // you get widths from one element and set them on another, which is why this looks
        // kind of weird.
        const widths = this.el.getColumnWidths();
        this.ft.setColumnWidths(widths);
        this.el.setColumnWidths(widths);

        if (nowFloating) {
            this.floatHeader();
        }
        return this;
    }





}


export default class FloatThead {
    constructor(el, options = { //TODO: need to use object.assign here, this dont worky
            headerCellSelector: 'tr:visible:first>*:visible', //thead cells are this.
            zIndex: 1001, //zindex of the floating thead (actually a container div)
            position: 'auto', // 'fixed', 'absolute', 'auto'. auto picks the best for your table scrolling type.
            top: 0, //String or function($table) - offset from top of window where the header should not pass above
            bottom: 0, //String or function($table) - offset from the bottom of the table where the header should stop scrolling
            scrollContainer: function($table) { // or boolean 'true' (use offsetParent) | function -> if the table has horizontal scroll bars then this is the container that has overflow:auto and causes those scroll bars
              return null;
            },
            responsiveContainer: function($table) { // only valid if scrollContainer is not used (ie window scrolling). this is the container which will control y scrolling at some mobile breakpoints
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
        }) {
        // if (options.scrollContainer === true) {
        //     options.scrollContainer = getClosestScrollContainer;
        // }

        if(el.classList.contains(options.floatTableClass)){
            return this.el;
        }

        this.el = el;

        this.options = options;



        //TODO: resolve position: 'auto' into absolute or fixed


        this.manager = new TableManager(this.el, this.options);



        setTimeout(() => {
            this.manager.syncColumns().floatHeader();
        }, 5000)

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
