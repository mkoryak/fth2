import { css, iter, crel } from './dom';

class ColumnTable {
    constructor(table, columnCount, options) {
        this.table = table;
        this.options = options;

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

export class Table extends ColumnTable {
    constructor(table, options) {
        table.classList.add(options.floatTableClass);

        this.head = table.querySelector('thead');

        this.originalStyle = {
            'table-layout': css(table, 'table-layout') || 'auto',
            'min-width':    css(table, 'min-width')
        };

        this.updateColumnCount();
        super(table, this.columnCount, options);
        // this.options = ...
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

    get tableWidth() {
        return this.table.clientWidth
            + parseInt(css(this.table, 'border-left-width'))
            + parseInt(css(this.table, 'border-right-width'))
    }




}

export class FloatTable extends ColumnTable {
    constructor(table, columnCount, options) {

        this.container = crel('fth-container');
        this.container.setAttribute('aria-hidden', 'true');

        //wrap the table in a container
        table.insertAdjacentElement('beforebegin', this.container);
        this.container.appendChild(table);


        table.createTHead().insertAdjacentHTML('beforeend', '<fth-tr class="fth-placeholder"></fth-tr>');

        this.head = table.querySelector('thead');

        this.headerHeight = null;

        super(table, columnCount, options);
        // this.options = ...
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

    setWidth(width){
        css(this.container, {width});
    }

    // i am not sure this method should live here or that this class should know about this.$

}



