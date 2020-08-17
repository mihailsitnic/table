import React, { Component } from 'react';
import Select from 'react-select'
import colors from './colors'
import PropTypes from 'prop-types';
import axios from 'axios';
import chroma from 'chroma-js';
import './style.css'
import img from '../../img'

class ServerTable extends Component {
    constructor(props) {
        super(props);

        if (this.props.columns === undefined || this.props.url === undefined) {
            console.log("The prop 'columns' and 'url' is required.");
        }

        let default_texts = Object.assign(ServerTable.defaultProps.options.texts, {});
        let default_parameters_names = Object.assign(ServerTable.defaultProps.options.requestParametersNames, {});

        this.state = {
            options: Object.assign(ServerTable.defaultProps.options, this.props.options),
            requestData: {
                query: '',
                limit: 10,
                page: 1,
                orderBy: '',
                direction: 0,
            },
            data: [],
        };
        this.state.requestData.limit = this.state.options.perPage;
        this.state.options.texts = Object.assign(default_texts, this.props.options.texts);
        this.state.options.requestParametersNames = Object.assign(default_parameters_names, this.props.options.requestParametersNames);

        this.handlePerPageChange = this.handlePerPageChange.bind(this);
        this.table_search_input = React.createRef();
    }


    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.url !== this.props.url) {
            this.setState(() => {
                this.handleFetchData();
            });
        }
        return true;
    }

    componentDidMount() {
        this.handleFetchData();
    }

    renderColumns() {
        const columns = this.props.columns.slice();
        const headings = this.state.options.headings;
        const options = this.state.options;
        const columns_width = this.state.options.columnsWidth;

        return columns.map((column) => (
            <th key={column}
                className={'table-' + column + '-th ' + (options.sortable.includes(column) ? ' table-sort-th ' : '') +
                    (options.columnsAlign.hasOwnProperty(column) ? ' text-' + options.columnsAlign[column] : '')}
                style={{
                    maxWidth: columns_width.hasOwnProperty(column) ?
                        Number.isInteger(columns_width[column]) ?
                            columns_width[column] + '%' :
                            columns_width[column] : ''
                }}
                onClick={() => this.handleSortColumnClick(column)}>
                <span>{headings.hasOwnProperty(column) ? headings[column] : column.replace(/^\w/, c => c.toUpperCase())}</span>
                {
                    options.sortable.includes(column) && <span
                        className={'table-sort-icon pull-right ' + (this.state.requestData.orderBy !== column ? 'default' : (this.state.requestData.direction === 1 ? 'up' : 'down'))} />
                }
            </th>
        ));
    }

    renderData() {
        const data = this.state.data.slice();
        const columns = this.props.columns.slice();
        const has_children = this.props.children !== undefined;
        let self = this;

        return data.map((row, row_index) => {
            row.index = row_index;
            return (
                <tr key={row_index} className="student-tr">
                    {
                        columns.map((column, index) => (
                            <td key={column + index} className={'table-' + column + '-td'}>
                                {has_children ?
                                    self.props.children(row, column) :
                                    row[column]}
                            </td>
                        ))
                    }
                </tr>
            )
        });
    }

    renderPagination() {
        const options = this.state.options;

        let pagination = [];

        pagination.push(
            <li key="first"
                className={'page-item ' + (options.currentPage === 1 || options.currentPage === 0 ? 'disabled' : '')}>
                <span onClick={() => this.handlePageChange(1)} className="page-link">←</span>
            </li>
        );
        for (let i = 1; i <= options.lastPage; i++) {
            pagination.push(
                <li key={i} className={'page-item ' + (options.currentPage === i ? 'active' : '')}>
                    <span onClick={() => this.handlePageChange(i)} className="page-link">{i}</span>
                </li>
            );
        }
        pagination.push(
            <li key="last" className={'page-item ' + (options.currentPage === options.lastPage ? 'disabled' : '')}>
                <span onClick={() => this.handlePageChange(options.lastPage)} className="page-link">→</span>
            </li>
        );

        return pagination;
    }

    handleSortColumnClick(column) {
        if (this.state.options.sortable.includes(column)) {
            const request_data = this.state.requestData;

            if (request_data.orderBy === column) {
                request_data.direction = request_data.direction === 1 ? 0 : 1;
            } else {
                request_data.orderBy = column;
                request_data.direction = 1;
            }

            this.setState({ requestData: request_data }, () => {
                this.handleFetchData();
            });
        }
    }

    refreshData() {
        this.setState(() => {
            this.handleFetchData();
        });
    }

    mapRequestData() {
        let parametersNames = this.state.options.requestParametersNames;
        let directionValues = Object.assign(this.props.options.orderDirectionValues || {}, ServerTable.defaultProps.options.orderDirectionValues);
        let requestData = this.state.requestData;

        return {
            [parametersNames.query]: requestData.query,
            [parametersNames.limit]: requestData.limit,
            [parametersNames.page]: requestData.page,
            [parametersNames.orderBy]: requestData.orderBy,
            [parametersNames.direction]: requestData.direction === 1 ? directionValues.ascending : directionValues.descending,
        };
    }

    handleFetchData() {
        const url = this.props.url;
        let options = Object.assign({}, this.state.options);
        let requestData = Object.assign({}, this.state.requestData);
        let self = this;

        const urlParams = new URLSearchParams(this.mapRequestData());
        let baseUrl = new URL(url);

        let com = baseUrl.search.length ? '&' : '?';

        axios.get(url + com + urlParams.toString())
            .then((response) => {
                let response_data = response.data;

                let out_adapter = self.state.options.responseAdapter(response_data);

                if (out_adapter === undefined || !out_adapter ||
                    typeof out_adapter !== 'object' || out_adapter.constructor !== Object ||
                    !out_adapter.hasOwnProperty('data') || !out_adapter.hasOwnProperty('total')) {
                    console.log("You must return 'object' contains 'data' and 'total' attributes")
                } else if (out_adapter.data === undefined || out_adapter.total === undefined) {
                    console.log("Please check from returned data or your 'responseAdapter'. \n response must have 'data' and 'total' attributes.")
                }

                options.total = out_adapter.total;
                if (out_adapter.total === 0) {
                    options.currentPage = 0;
                    options.lastPage = 0;
                    options.from = 0;
                    options.to = 0;
                } else {
                    options.currentPage = requestData.page;
                    options.lastPage = Math.ceil(out_adapter.total / requestData.limit);
                    options.from = requestData.limit * (requestData.page - 1) + 1;
                    options.to = options.lastPage === options.currentPage ? options.total : requestData.limit * (requestData.page);
                }

                self.setState({ data: out_adapter.data, options: options});
            });
    }

    handlePerPageChange(event) {
        const { value } = event.target;
        let options = Object.assign({}, this.state.options);
        let requestData = Object.assign({}, this.state.requestData);

        options.perPage = value;
        requestData.limit = event.target.value;
        requestData.page = 1;

        this.setState({ requestData: requestData, options: options }, () => {
            this.handleFetchData();
        });
    }

    handlePageChange(page) {
        let requestData = Object.assign({}, this.state.requestData);
        requestData.page = page;

        this.setState({ requestData: requestData }, () => {
            this.handleFetchData();
        });
    }

    handleSearchClick() {
        let query = this.table_search_input.current.value;
        let requestData = Object.assign({}, this.state.requestData);
        requestData.query = query;
        requestData.page = 1;

        this.setState({ requestData: requestData }, () => {
            this.handleFetchData();
        });
    }

    render() {

        const dot = (color = '#ccc') => ({
            alignItems: 'center',
            display: 'flex',

            ':before': {
                backgroundColor: color,
                borderRadius: 2,
                content: '" "',
                display: 'block',
                marginRight: 14,
                height: 8,
                width: 8,
            },
        });

        const colourStyles = {
            control: styles => ({ ...styles, backgroundColor: 'white' }),
            option: (styles, { data, isDisabled, isFocused, isSelected }) => {
                const color = chroma(data.color);
                return {
                  ...styles,
                  backgroundColor: isDisabled
                    ? null
                    : isSelected
                    ? data.color
                    : isFocused
                    ? color.alpha(0.1).css()
                    : null,
                  color: isDisabled
                    ? '#ccc'
                    : isSelected
                    ? chroma.contrast(color, 'white') > 2
                      ? 'white'
                      : 'black'
                    : data.color,
                  cursor: isDisabled ? 'not-allowed' : 'default',
            
                  ':active': {
                    ...styles[':active'],
                    backgroundColor: !isDisabled && (isSelected ? data.color : color.alpha(0.3).css()),
                  },
                };
              },
            input: styles => ({ ...styles, ...dot() }),
            placeholder: styles => ({ ...styles, ...dot() }),
            singleValue: (styles, { data }) => ({ ...styles, ...dot(data.color) }),
        };

        const RenderFilterByStatus = () => (
            <Select
                defaultValue={colors[0]}
                label="Single select"
                options={colors}
                styles={colourStyles}
            />
        )

        return (
            <div className="student-table">
                {
                    (this.props.perPage || this.props.search) &&

                    <header className="table-header">
                        <div className="table-header-left">
                            <h3>Студенты</h3>
                            <span>{this.state.options.total}</span>
                        </div>
                        <div className="table-header-right">
                            {
                                this.props.search &&
                                <div className="input-icon input-group-sm float-right">
                                    <div className="form-control-search-wrap">
                                        <img alt="img" src={img.search} className="form-control-search-icon" />
                                        <input type="text" className="form-control form-control-search" style={{ height: 34 }}
                                            placeholder={this.state.options.texts.search} ref={this.table_search_input}
                                            onKeyUp={() => this.handleSearchClick()} />

                                    </div>
                                </div>
                            }

                            <div className="select-wrap">
                                <RenderFilterByStatus />
                            </div>

                        </div>

                    </header>
                }

                <div className="card-body">
                    <div className="table-responsive" style={{ maxHeight: this.props.options.maxHeightTable }}>
                        <table className="table">
                            <thead className="student-thead">
                                <tr>
                                    {this.renderColumns()}
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    this.state.options.total > 0 ?
                                        this.renderData() :
                                        <tr className="student-tr">
                                            <td colSpan={this.props.columns.length}>{this.state.options.texts.empty}</td>
                                        </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="student-tfoot">
                    <div className="student-tfoot-left">
                        {
                            this.props.perPage &&
                            <div>
                                <span>{this.state.options.texts.show} </span>
                                <label>
                                    <select className="form-control"
                                        onChange={this.handlePerPageChange}>
                                        {this.state.options.perPageValues.map(value => (
                                            <option key={value} value={value}>{value} строк</option>
                                        ))}
                                    </select>
                                </label>
                                <span> {this.state.options.texts.entries}</span>
                            </div>
                        }

                        <div className="student-tfoot-left-info">
                            {
                                this.props.pagination ?
                                    <div>
                                        {this.state.options.texts.showing + ' ' + this.state.options.from + '-' + this.state.options.texts.to + '' +
                                            this.state.options.to + ' ' + this.state.options.texts.of + ' ' + this.state.options.total +
                                            ' ' + this.state.options.texts.entries}
                                    </div> :
                                    <div>
                                        {
                                            this.state.options.total + ' ' + this.state.options.texts.entries
                                        }
                                    </div>
                            }
                        </div>


                    </div>
                    <div className="student-tfoot-right">
                        {
                            this.props.pagination &&
                            <ul className="student-pagination">
                                {this.renderPagination()}
                            </ul>
                        }
                    </div>
                </div>
            </div>
        );
    }
}

ServerTable.defaultProps = {
    options: {
        headings: { avatar: '', name: 'Имя и Фамилия', email: 'Эл. почта', phone: 'Телефон', status: 'Статус', actions: 'Действия' },
        sortable: ['name'],
        columnsWidth: {},
        columnsAlign: {},
        initialPage: 1,
        perPage: 10,
        perPageValues: [10, 20, 25, 100],
        texts: {
            show: '',
            entries: '',
            showing: 'Показано',
            to: '',
            of: 'из',
            search: 'Поиск',
            empty: 'Нет студентов'
        },
        requestParametersNames: {
            query: 'search',
            limit: 'limit',
            page: 'page',
            orderBy: 'orderBy',
            direction: 'order',
        },
        orderDirectionValues: {
            ascending: 'asc',
            descending: 'desc',
        },
        total: 10,
        currentPage: 1,
        lastPage: 1,
        from: 1,
        to: 1,
        responseAdapter: (resp_data) => {
            return { data: resp_data.data, total: resp_data.total }
        },
        maxHeightTable: 'unset'
    },
    perPage: true,
    search: true,
    pagination: true,
    updateUrl: false,
};

ServerTable.propTypes = {
    columns: PropTypes.array.isRequired,
    url: PropTypes.string.isRequired,

    hover: PropTypes.bool,
    bordered: PropTypes.bool,
    condensed: PropTypes.bool,
    striped: PropTypes.bool,
    perPage: PropTypes.bool,
    search: PropTypes.bool,
    pagination: PropTypes.bool,
    updateUrl: PropTypes.bool,

    options: PropTypes.object,
    children: PropTypes.func,
};


export default ServerTable;