// X4CryptoTables class
// data storage and system functions
function X4CryptoTables() {
  this.history = [];
  this.historySent = {};

  this.front = null;
  this.exchangeRates = null;
  this.tradeHook = [];

  return this;
}

X4CryptoTables.prototype.symbols = {
  USD: '$', EUR: '€', GBP: '£', AUD: '$',
  BRL: 'R$', CAD: '$', CHF: 'Fr.', CNY: '¥',
  HKD: '$', INR: '₹', JPY: '¥', MXN: '$',
  PHP: '₱', PLN: 'zł', RUB: '₽', SEK: 'kr',
  SGD: '$', ZAR: 'R',
};

// wait for specific condition before executing some actions
X4CryptoTables.prototype.wait = function(condition, callback) {
  var iteration = function() {
    if (condition()) {
      clearInterval(interval);
      callback();
    }
  }

  var interval = setInterval(iteration, 100);

  iteration();
}

// send http ajax request to remote server and return json result
X4CryptoTables.prototype.request = function(url, callback) {
  var xmlHttp = new XMLHttpRequest();

  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
      callback(JSON.parse(xmlHttp.responseText));
    }
  }

  xmlHttp.open('GET', url, true);
  xmlHttp.send();
}

// get a set of exchange rates using CoinCap.io API
X4CryptoTables.prototype.getExchangeRates = function() {
  var self = this;

  self.request('https://coincap.io/exchange_rates', function(response) {
    self.exchangeRates = response;
  });
}

// get a set of coins data using CoinCap.io API
X4CryptoTables.prototype.getFront = function() {
  var self = this;

  self.request('https://coincap.io/front', function(response) {
    self.front = {};

    response.forEach(function(item) {
      self.front[item.short] = item;
    });
  });
}

// connect to CoinCap.io API through Socket.io to listen for coin data changes
X4CryptoTables.prototype.getTrades = function() {
  var self = this;

  var socket = io.connect('https://coincap.io');

  socket.on('trades', function(response) {
    if (self.front && self.front[response.coin]) {
      response.msg.color = response.msg.price !== self.front[response.coin].price
        ? response.msg.price > self.front[response.coin].price
          ? 'green'
          : 'red'
        : self.front[response.coin].color;

      self.tradeHook.forEach(function(hook) {
        hook(response.msg);
      })

      for (var key in response.msg) {
        self.front[response.coin][key] = response.msg[key];
      }
    }
  })
}

// get history of specific cryptocurrency and time period using CoinCap.io API
X4CryptoTables.prototype.getHistory = function(coin, period, callback) {
  var self = this;

  if (self.historySent[coin + period]) {
    return;
  }

  self.historySent[coin + period] = true;

  var url = 'https://coincap.io/history/' + (period !== 'all' ? period + '/' : '') + coin

  self.request(url, function(response) {
    response.mktcap = response.market_cap;
    delete response.market_cap;

    // remove incorrect last result (CoinCap issue)
    response.price.pop();
    response.mktcap.pop();
    response.volume.pop();

    self.history[coin] = self.history[coin] || {};
    self.history[coin][period] = response;

    delete self.historySent[coin + period];

    callback();
  });
}

// format cryptocurrency name based on icon, long and short value
X4CryptoTables.prototype.formatName = function(short, format, value) {
  var formatted = format.template;

  if (formatted.indexOf('[icon]') !== -1) {
    var coin = value.toLowerCase().replace(/\s|\.\.\./g, '');
    formatted = formatted.replace('[icon]', '<div class="x4-cc-coin x4-cc-coin-' + coin + '"></div>');
  }

  if (formatted.indexOf('[long]') !== -1) {
    formatted = formatted.replace('[long]', '<div class="x4-long">' + value + '</div>');
  }

  if (formatted.indexOf('[short]') !== -1) {
    formatted = formatted.replace('[short]', '<div class="x4-short">' + short + '</div>');
  }

  return formatted;
}

// format cryptocurrency price based on value template
X4CryptoTables.prototype.formatPrice = function(fiat, format, value) {
  var self = this;

  var formatted = format.template;

  if (formatted.indexOf('[symbol]') !== -1) {
    if (self.symbols[fiat]) {
      formatted = formatted.replace('[symbol]', '<div class="x4-symbol">' + self.symbols[fiat] + '</div>');
      formatted = formatted.replace(/\s*\[abbreviation\]\s*/, '');
    } else {
      formatted = formatted.replace('[symbol]', '');
    }
  }

  if (formatted.indexOf('[abbreviation]') !== -1) {
    formatted = formatted.replace('[abbreviation]', '<div class="x4-fiat">' + fiat + '</div>');
  }

  if (formatted.indexOf('[value]') !== -1) {
    var rate = self.exchangeRates.rates[fiat] || 1;
    value = self.formatValue(value * rate, format.factor, format.separator, format.precision);
    formatted = formatted.replace('[value]', '<div class="x4-number">' + value + '</div>');
  }

  return formatted;
}

// format cryptocurrency supply based on value template
X4CryptoTables.prototype.formatSupply = function(column, value) {
  var self = this;

  var formatted = column.template;

  if (formatted.indexOf('[value]') !== -1) {
    value = self.formatValue(value, column.factor, column.separator, column.precision);
    formatted = formatted.replace('[value]', '<div class="x4-number">' + value + '</div>');
  }

  return formatted;
}

// format cryptocurrency percent change based on value template
X4CryptoTables.prototype.formatPerc = function(format, value) {
  var self = this;

  var formatted = format.template;

  if (formatted.indexOf('%') !== -1) {
    formatted = formatted.replace('%', '<div class="x4-percent">%</div>');
  }

  if (formatted.indexOf('[value]') !== -1) {
    value = self.formatValue(value, format.factor, format.separator, format.precision);
    formatted = formatted.replace('[value]', '<div class="x4-number">' + value + '</div>');
  }

  return formatted;
}

// format any value based on factor, separator, precision
X4CryptoTables.prototype.formatValue = function(value, factor, separator, precision) {
  var abbrs = ['K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
  var abbr = '';

  if (factor) {
    var max = factor !== 'auto'
      ? abbrs.indexOf(factor) + 1
      : 8;

    for (var i = 0; i < max; i++) {
      var val = value / 1000;

      if (factor === 'auto' && val < 1) {
        break;
      }

      abbr = abbrs[i];
      value = val;
    }
  }

  value = value.toFixed(precision).toString().split('.');
  value[0] = value[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  return value.join('.') + abbr;
}

// initialize data loader element
X4CryptoTables.prototype.uiLoader = function() {
  var $el = document.createElement('div');
  $el.className = 'x4-ui-loader';

  var $shape1 = document.createElement('div');
  $shape1.className = 'x4-shape x4-shape1 x4-primary-border';

  var $shape2 = document.createElement('div');
  $shape2.className = 'x4-shape x4-shape2 x4-primary-border';

  var $shape3 = document.createElement('div')
  $shape3.className = 'x4-shape x4-shape3 x4-primary-border';

  $el.appendChild($shape1);
  $el.appendChild($shape2);
  $el.appendChild($shape3);

  return $el;
}

// initialize select box element with different options and events
X4CryptoTables.prototype.uiSelect = function(args) {
  var self = this;

  var $el = document.createElement('div');
  $el.className = 'x4-ui-select';

  // initialize values
  if (Array.isArray(args.values)) {
    args.values = {
      items: args.values.map(function(value) {
        return { value: value, title: value };
      }),
      value: 'value',
      title: 'title',
    };
  }

  // initialize title
  var title = args.values.items.filter(function(item) {
    return item[args.values.value] === args.value;
  });

  title = title.length > 0 ? title[0][args.values.title] : '';

  // initialize select box controls
  var $box = document.createElement('div');
  $box.className = 'x4-box';

  var $value = document.createElement('div');
  $value.className = 'x4-value';
  $value.innerHTML = title;

  var $icon = document.createElement('div');
  $icon.className = 'x4-icon';
  $icon.innerHTML = self.icon_arrow_drop_down;

  var $line = document.createElement('div');
  $line.className = 'x4-line';

  var $shape1 = document.createElement('div');
  $shape1.className = 'x4-shape1';

  var $shape2 = document.createElement('div');
  $shape2.className = 'x4-shape2 x4-primary-back';

  $line.appendChild($shape1);
  $line.appendChild($shape2);
  $box.appendChild($value);
  $box.appendChild($icon);
  $box.appendChild($line);

  var $backdrop = document.createElement('div');
  $backdrop.className = 'x4-backdrop';

  var $menu = document.createElement('div');
  $menu.className = 'x4-menu x4-scroll';

  // initialize select options list
  var options = [];

  args.values.items.forEach(function(item) {
    var active = item[args.values.value] === args.value;
    var activeClass = active ? ' x4-active x4-primary-color' : '';

    var $option = document.createElement('div');
    $option.className = 'x4-option' + activeClass;
    $option.setAttribute('data-value', item[args.values.value]);
    $option.innerHTML = item[args.values.title];

    // select option click event handler
    $option.addEventListener('click', function() {
      var $active = options.filter(function($option) {
        return $option.className.indexOf('x4-active') !== -1;
      })[0];

      if ($active && $active !== this) {
        $active.className = $active.className.replace(' x4-active', '').replace(' x4-primary-color', '');
        this.className += ' x4-active x4-primary-color';

        $value.innerHTML = this.innerHTML;
        $el.className = $el.className.replace(' x4-focused', '');

        args.onChange(this.getAttribute('data-value'));
      }
    });

    $menu.appendChild($option);
    options.push($option);
  });

  $el.appendChild($box);
  $el.appendChild($backdrop);
  $el.appendChild($menu);

  // initialize label
  if (args.label) {
    var $label = document.createElement('div');
    $label.className = 'x4-label';
    $label.innerHTML = args.label;
    $el.appendChild($label);
  }

  // select box click event handler
  $box.addEventListener('click', function() {
    $el.className += ' x4-focused';

    var $active = options.filter(function($option) {
      return $option.className.indexOf('x4-active') !== -1;
    })[0];

    if ($active) {
      $menu.scrollTop = $active.offsetTop - 2 * $active.offsetHeight;
    }
  })

  // backdrop click event handler
  $backdrop.addEventListener('click', function() {
    $el.className = $el.className.replace(' x4-focused', '');
  });

  return $el;
}

// initialize input box element with different options and events
X4CryptoTables.prototype.uiInput = function(args) {
  // initialize input box controls
  var $el = document.createElement('div');
  $el.className = 'x4-ui-input';

  var $box = document.createElement('div');
  $box.className = 'x4-box';

  var $input = document.createElement('input');
  $input.setAttribute('type', args.type || 'text');
  $input.value = args.value || '';

  if (args.placeholder) {
    $input.setAttribute('placeholder', args.placeholder);
  }

  var $line = document.createElement('div');
  $line.className = 'x4-line';

  var $shape1 = document.createElement('div');
  $shape1.className = 'x4-shape1';

  var $shape2 = document.createElement('div');
  $shape2.className = 'x4-shape2 x4-primary-back';

  $line.appendChild($shape1);
  $line.appendChild($shape2);
  $box.appendChild($input);
  $box.appendChild($line);
  $el.appendChild($box);

  if (args.label) {
    var $label = document.createElement('div');
    $label.className = 'x4-label';
    $label.innerHTML = args.label;
    $el.appendChild($label);
  }

  // initialize input box events
  $input.addEventListener('focus', function() {
    $el.className += ' x4-focused';
  });

  $input.addEventListener('blur', function() {
    $el.className = $el.className.replace(' x4-focused', '');
  });

  $input.addEventListener('input', function() {
    args.onInput($input.value);
  });

  return $el;
}

// initialize table widget with different options and events
X4CryptoTables.prototype.uiTable = function(args) {
  var self = this;

  var $el = document.createElement('div');
  $el.className = 'x4-ui-table';

  var $inside = document.createElement('div');
  $inside.className = 'x4-inside';

  var $head = document.createElement('div');
  $head.className = 'x4-head';

  var $row = document.createElement('div');
  $row.className = 'x4-row x4-primary-border';

  // initialize table head section with sorting
  var ccolumns = [];

  args.columns.forEach(function(column) {
    var sortActive = column.field === args.sortField;
    var sortActiveClass = sortActive ? ' x4-sort-active' : '';
    var alignRightClass = column.align === 'right' ? ' x4-align-right' : '';
    var stype = (sortActive && args.sortType === 'asc') || (!sortActive && column.sort === 'asc') ? 'asc' : 'desc';

    var $column = document.createElement('div');
    $column.className = 'x4-column x4-' + column.field + alignRightClass + sortActiveClass;

    var $sort = document.createElement('div');
    $sort.className = 'x4-sort x4-icon x4-' + stype;
    $sort.innerHTML = self.icon_arrow_upward;

    var $value = document.createElement('div');
    $value.className = 'x4-value';
    $value.innerHTML = column.title;

    $column.appendChild($sort);
    $column.appendChild($value);

    // sort column, head column click event handler
    $column.addEventListener('click', function() {
      var $active = ccolumns.filter(function($column) {
        return $column.className.indexOf('x4-sort-active') !== -1;
      })[0];

      if ($active && $active !== $column) {
        $active.className = $active.className.replace(' x4-sort-active', '');
        $column.className += ' x4-sort-active';
      }

      args.sortType = column.field === args.sortField
        ? args.sortType === 'asc' ? 'desc' : 'asc'
        : column.sort;

      args.sortField = column.field;
      
      $sort.className = $sort.className.replace(' x4-asc', '').replace(' x4-desc', '');
      $sort.className += ' x4-' + args.sortType;

      args.onChangeSort(args.sortField, args.sortType);
    })

    $row.appendChild($column);

    ccolumns.push($column);
  });

  $head.appendChild($row);

  // initialize table body section with content
  var $body = document.createElement('div');
  $body.className = 'x4-body';

  var index = 1;

  args.items.forEach(function(item) {
    var $row = document.createElement('div');
    $row.className = 'x4-row ' + (index++ % 2 === 0 ? 'x4-even' : 'x4-odd');
    $row.setAttribute('data-value', item[args.key]);

    args.columns.forEach(function(column) {
      var sortActive = column.field === args.sortField;
      var sortActiveClass = sortActive ? ' x4-sort-active' : '';
      var alignRightClass = column.align === 'right' ? ' x4-align-right' : '';

      var $column = document.createElement('div');
      $column.className = 'x4-column x4-' + column.field + alignRightClass + sortActiveClass;

      var $value = args.onRenderValue(item, column);
      $column.appendChild($value);

      $row.appendChild($column);
    });

    if (args.onRowClick) {
      $row.addEventListener('click', function() {
        args.onRowClick($row, item);
      });
    }

    $body.appendChild($row);
  });

  $inside.appendChild($head);
  $inside.appendChild($body);
  $el.appendChild($inside);

  return $el;
}

// SVG material icons as text to allow to change their colors
X4CryptoTables.prototype.icon_arrow_drop_down = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>';
X4CryptoTables.prototype.icon_arrow_upward = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>';
X4CryptoTables.prototype.icon_attach_money = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/><path d="M0 0h24v24H0z" fill="none"/></svg>';
X4CryptoTables.prototype.icon_chevron_left = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/><path d="M0 0h24v24H0z" fill="none"/></svg>';
X4CryptoTables.prototype.icon_chevron_right = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/><path d="M0 0h24v24H0z" fill="none"/></svg>';
X4CryptoTables.prototype.icon_layers = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>';
X4CryptoTables.prototype.icon_search = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M0 0h24v24H0z" fill="none"/></svg>';

// X4CryptoTable class
// initialize specific table instance
function X4CryptoTable(element, options) {
  var self = this;

  self.initElement(element);
  self.initOptions(options);
  self.initColors(element);

  x4CryptoTables.wait(
    function() {
      return self.element && self.element.parentNode; 
    },
    function() {
      self.initLoader();
      self.initFont();

      x4CryptoTables.wait(
        function() {
          return x4CryptoTables.exchangeRates && x4CryptoTables.front; 
        },
        function() {
          self.initBadgeColors();
          self.refreshItems();
          self.renderWidget();
        }
      );
    }
  );

  return this;
}

// add widget colors for borders, background, texts, icons
X4CryptoTable.prototype.initColors = function(element) {
  var $style = document.createElement('style');
  $style.type = 'text/css';

  var innerHTML = '';

  var selector = document.getElementById(element) !== null
    ? '#' + element
    : element;

  for (var name in this.options.colors) {
    var color = this.options.colors[name];
    innerHTML += selector + ' .x4-' + name + '-back{background-color:' + color + '!important}';
    innerHTML += selector + ' .x4-' + name + '-border{border-color:' + color + '!important}';
    innerHTML += selector + ' .x4-' + name + '-color{color:' + color + '!important}';
    innerHTML += selector + ' .x4-' + name + '-fill svg{fill:' + color + '!important}';
  }

  $style.innerHTML = innerHTML;
  document.head.appendChild($style);
}

// initialize the DOM element for injecting the table widget
X4CryptoTable.prototype.initElement = function(element) {
  var self = this;

  var init = function() {
    self.element = document.getElementById(element) || document.querySelector(element);

    if (!self.element) {
      //console.error('X4 Crypto Tables: DOM element "' + element + '" does not exist.');
    } else {
      self.element.className = self.element.className
        ? self.element.className + ' x4-crypto-tables'
        : 'x4-crypto-tables';
    }
  }

  if (document.readyState === 'loading') {
    return document.addEventListener('DOMContentLoaded', init);
  }
  
  init();
}

// initialize the widget options based on user and default values
X4CryptoTable.prototype.initOptions = function(options) {
  var self = this;

  options = options || {};

  // predefine empty values
  options.colors = options.colors || {};
  options.coins = options.coins || {};

  // predefine columns empty values
  options.columns = options.columns || {};
  options.columns.schema = options.columns.schema || {};
  options.columns.schema.long = options.columns.schema.long || {};
  options.columns.schema.mktcap = options.columns.schema.mktcap || {};
  options.columns.schema.price = options.columns.schema.price || {};
  options.columns.schema.vwapData = options.columns.schema.vwapData || {};
  options.columns.schema.supply = options.columns.schema.supply || {};
  options.columns.schema.volume = options.columns.schema.volume || {};
  options.columns.schema.perc = options.columns.schema.perc || {};
  options.columns.sort = options.columns.sort || {};

  // predefine chart empty values
  options.chart = options.chart || {};
  options.chart.property = options.chart.property || {};
  options.chart.property.schema = options.chart.property.schema || {};
  options.chart.property.schema.price = options.chart.property.schema.price || {};
  options.chart.property.schema.mktcap = options.chart.property.schema.mktcap || {};
  options.chart.property.schema.volume = options.chart.property.schema.volume || {};
  options.chart.period = options.chart.period || {};
  options.chart.period.schema = options.chart.period.schema || {};
  options.chart.period.schema['365day'] = options.chart.period.schema['365day'] || {};
  options.chart.period.schema['180day'] = options.chart.period.schema['180day'] || {};
  options.chart.period.schema['90day'] = options.chart.period.schema['90day'] || {};
  options.chart.period.schema['30day'] = options.chart.period.schema['30day'] || {};
  options.chart.period.schema['7day'] = options.chart.period.schema['7day'] || {};
  options.chart.period.schema['1day'] = options.chart.period.schema['1day'] || {};

  // predefine controls empty values
  options.fiat = options.fiat || {};
  options.perPage = options.perPage || {};
  options.search = options.search || {};
  options.pager = options.pager || {};
  options.flashes = options.flashes || {};
  options.flashes.colors = options.flashes.colors || {};
  options.badges = options.badges || {};
  options.badges.colors = options.badges.colors || {};
  options.font = options.font || {};
  options.width = options.width || {};
  options.padding = options.padding || {};

  // mix user and default values
  self.options = {
    loader: options.loader !== undefined ? options.loader : true,
    colors: {
      primary: options.colors.primary || '#665B94',
    },
    coins: {
      strategy: options.coins.strategy || 'include_all',
      except: options.coins.except || [],
    },
    // mix columns options
    columns: {
      items: options.columns.items || ['long', 'mktcap', 'price', 'vwapData', 'supply', 'volume', 'perc'],
      hideOrder: options.columns.hideOrder || ['volume', 'supply', 'vwapData', 'mktcap', 'perc', 'price'],
      schema: {
        long: {
          title: options.columns.schema.long.title || 'Name',
          sort: options.columns.schema.long.sort || 'asc',
          align: options.columns.schema.long.align || 'left',
          template: options.columns.schema.long.template || '[icon][long] ([short])'
        },
        mktcap: {
          title: options.columns.schema.mktcap.title || 'Market Cap',
          sort: options.columns.schema.mktcap.sort || 'desc',
          align: options.columns.schema.mktcap.align || 'right',
          template: options.columns.schema.mktcap.template || '[symbol][value] [abbreviation]',
          factor: options.columns.schema.mktcap.factor || '',
          separator: options.columns.schema.mktcap.separator !== undefined ? options.columns.schema.mktcap.separator : ',',
          precision: options.columns.schema.mktcap.precision || 0,
        },
        price: {
          title: options.columns.schema.price.title || 'Price',
          sort: options.columns.schema.price.sort || 'desc',
          align: options.columns.schema.price.align || 'right',
          template: options.columns.schema.price.template || '[symbol][value] [abbreviation]',
          factor: options.columns.schema.price.factor || '',
          separator: options.columns.schema.price.separator !== undefined ? options.columns.schema.price.separator : ',',
          precision: options.columns.schema.price.precision || 2,
        },
        vwapData: {
          title: options.columns.schema.vwapData.title || 'VWAP',
          sort: options.columns.schema.vwapData.sort || 'desc',
          align: options.columns.schema.vwapData.align || 'right',
          template: options.columns.schema.vwapData.template || '[symbol][value] [abbreviation]',
          factor: options.columns.schema.vwapData.factor || '',
          separator: options.columns.schema.vwapData.separator !== undefined ? options.columns.schema.vwapData.separator : ',',
          precision: options.columns.schema.vwapData.precision || 2,
        },
        supply: {
          title: options.columns.schema.supply.title || 'Supply',
          sort: options.columns.schema.supply.sort || 'desc',
          align: options.columns.schema.supply.align || 'right',
          template: options.columns.schema.supply.template || '[value]',
          factor: options.columns.schema.supply.factor || '',
          separator: options.columns.schema.supply.separator !== undefined ? options.columns.schema.supply.separator : ',',
          precision: options.columns.schema.supply.precision || 0,
        },
        volume: {
          title: options.columns.schema.volume.title || 'Volume',
          sort: options.columns.schema.volume.sort || 'desc',
          align: options.columns.schema.volume.align || 'right',
          template: options.columns.schema.volume.template || '[symbol][value] [abbreviation]',
          factor: options.columns.schema.volume.factor || '',
          separator: options.columns.schema.volume.separator !== undefined ? options.columns.schema.volume.separator : ',',
          precision: options.columns.schema.volume.precision || 0,
        },
        perc: {
          title: options.columns.schema.perc.title || '%24h',
          sort: options.columns.schema.perc.sort || 'desc',
          align: options.columns.schema.perc.align || 'right',
          template: options.columns.schema.perc.template || '[value]%',
          factor: options.columns.schema.perc.factor || '',
          separator: options.columns.schema.perc.separator !== undefined ? options.columns.schema.perc.separator : ',',
          precision: options.columns.schema.perc.precision || 2,
        },
      },
      sort: {
        field: options.columns.sort.field || 'mktcap',
        type: options.columns.sort.type || 'desc',
      },
    },
    // mix chart options
    chart: {
      visible: options.chart.visible !== undefined ? options.chart.visible : true,
      loader: options.chart.loader !== undefined ? options.chart.loader : true,
      height: options.chart.height || 320,
      boxHeight: options.chart.boxHeight || 435,
      property: {
        visible: options.chart.property.visible !== undefined ? options.chart.property.visible : true,
        value: options.chart.property.value || 'price',
        items: options.chart.property.items || ['price', 'mktcap', 'volume'],
        schema: {
          price: {
            title: options.chart.property.schema.price.title || 'Price',
          },
          mktcap: {
            title: options.chart.property.schema.mktcap.title || 'Market Cap',
          },
          volume: {
            title: options.chart.property.schema.volume.title || 'Volume',
          },
        },
        label: options.chart.property.label || 'Pick a property',
      },
      period: {
        visible: options.chart.period.visible !== undefined ? options.chart.period.visible : true,
        value: options.chart.period.value || '30day',
        items: options.chart.period.items || ['365day', '180day', '90day', '30day', '7day', '1day'],
        schema: {
          '365day': {
            title: options.chart.period.schema['365day'].title || '365 days',
          },
          '180day': {
            title: options.chart.period.schema['180day'].title || '180 days',
          },
          '90day': {
            title: options.chart.period.schema['90day'].title || '90 days',
          },
          '30day': {
            title: options.chart.period.schema['30day'].title || '30 days',
          },
          '7day': {
            title: options.chart.period.schema['7day'].title || '7 days',
          },
          '1day': {
            title: options.chart.period.schema['1day'].title || '1 day',
          },
        },
        label: options.chart.period.label || 'Period of time',
      },
    },
    // mix controls options
    fiat: {
      visible: options.fiat.visible !== undefined ? options.fiat.visible : true,
      value: options.fiat.value || 'USD',
      items: options.fiat.items || [
        'USD', 'EUR', 'GBP', 'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'HKD',
        'INR', 'JPY', 'MXN', 'PHP', 'PLN', 'RUB', 'SEK', 'SGD', 'ZAR',
      ],
      icon: options.fiat.icon !== undefined ? options.fiat.icon : true,
      label: options.fiat.label || 'Pick a fiat currency',
    },
    perPage: {
      visible: options.perPage.visible !== undefined ? options.perPage.visible : true,
      value: options.perPage.value || 20,
      items: options.perPage.items || [
        5, 10, 15, 20, 25, 30, 40, 50, 75, 100,
      ],
      icon: options.perPage.icon !== undefined ? options.perPage.icon : true,
      label: options.perPage.label || 'Coins per page',
    },
    search: {
      visible: options.search.visible !== undefined ? options.search.visible : true,
      value: options.search.value || '',
      icon: options.search.icon !== undefined ? options.search.icon : true,
      label: options.search.label || 'Search for coins',
    },
    pager: {
      visible: options.pager.visible !== undefined ? options.pager.visible : true,
      page: options.pager.page || 0,
    },
    flashes: {
      visible: options.flashes.visible !== undefined ? options.flashes.visible : true,
      colors: {
        green: options.flashes.colors.green || 'rgba(185,246,202,.5)',
        red: options.flashes.colors.red || 'rgba(252,228,236,.5)',
      },
    },
    badges: {
      visible: options.badges.visible !== undefined ? options.badges.visible : true,
      colors: {
        grey1: options.badges.colors.grey1 || '#ECEFF1',
        grey2: options.badges.colors.grey2 || '#90A4AE',
        green1: options.badges.colors.green1 || '#B9F6CA',
        green2: options.badges.colors.green2 || '#66BB6A',
        red1: options.badges.colors.red1 || '#FCE4EC',
        red2: options.badges.colors.red2 || '#F06292',
      },
    },
    font: {
      family: options.font.family || null,
      color: options.font.color || null,
      size: options.font.size || null,
    },
    width: {
      desktop: options.width.desktop || '100%',
      tablet: options.width.tablet || '100%',
      mobile: options.width.mobile || '100%',
    },
    padding: {
      desktop: options.padding.desktop || 0,
      tablet: options.padding.tablet || 0,
      mobile: options.padding.mobile || 0,
    },
  };

  // initialize coins data
  self.options.coins.data = {
    all: [],
    page: [],
  };

  // initialize chart data
  self.options.chart.data = {
    fields: {},
    periods: {},
  };

  // populate tablet and mobile padding
  if (!self.options.padding.tablet) {
    self.options.padding.tablet = self.options.padding.desktop;
  }

  if (!self.options.padding.mobile) {
    self.options.padding.mobile = self.options.padding.tablet;
  }
}

// show the data loader in place of the table
X4CryptoTable.prototype.initLoader = function() {
  var self = this;

  var $loader = document.createElement('div');
  $loader.className = 'x4-loader';

  var $uiLoader = x4CryptoTables.uiLoader();
  $loader.appendChild($uiLoader);

  self.element.appendChild($loader);

  // fix inline-block gap
  if (self.options.width.desktop !== '100%') {
    self.element.parentNode.style.fontSize = 0;
  }
}

// set default widget font options
X4CryptoTable.prototype.initFont = function() {
  var self = this;

  var computed = getComputedStyle(this.element);

  self.options.font.family = self.options.font.family || computed.fontFamily;
  self.options.font.color = self.options.font.color || computed.fontColor;
  self.options.font.size = self.options.font.size || computed.fontSize;

  if (!isNaN(parseFloat(self.options.font.size)) && isFinite(self.options.font.size)) {
    self.options.font.size += 'px';
  }

  self.element.style.fontFamily = self.options.font.family;
  self.element.style.fontSize = self.options.font.size;
  self.element.style.color = self.options.font.color;
}

// set default colors for value badges (price, vwap, perc)
X4CryptoTable.prototype.initBadgeColors = function() {
  var self = this;

  for (var short in x4CryptoTables.front) {
    x4CryptoTables.front[short].colors = [self.options.badges.colors.grey1, self.options.badges.colors.grey2];
  }
}

// select only needed coins, sort them and paginate
X4CryptoTable.prototype.refreshItems = function() {
  var self = this;

  self.options.coins.data.all = [];
  self.options.coins.data.page = [];

  var search = (self.options.search.value || '').toLowerCase();

  // filter coins
  for (var short in x4CryptoTables.front) {
    var item = x4CryptoTables.front[short];

    if (search && item.short.toLowerCase().indexOf(search) === -1 && item.long.toLowerCase().indexOf(search) === -1) {
      continue;
    }

    if (self.options.coins.strategy === 'include_all' && self.options.coins.except.indexOf(short) !== -1) {
      continue;
    }

    if (self.options.coins.strategy === 'exclude_all' && self.options.coins.except.indexOf(short) === -1) {
      continue;
    }

    self.options.coins.data.all.push(item);
  }
  
  // sort coins
  var sortField = self.options.columns.sort.field;
  var sortType = self.options.columns.sort.type;
  var sortFactor = sortType === 'asc' ? 1 : -1;

  self.options.coins.data.all.sort(function(a, b) {
    var A = a[sortField].toLowerCase ? a[sortField].toLowerCase() : a[sortField];
    var B = b[sortField].toLowerCase ? b[sortField].toLowerCase() : b[sortField];

    if (A < B) return -1 * sortFactor;
    if (A > B) return 1 * sortFactor;

    return 0;
  });

  self.refreshItemsPerPage();
}

// paginate selected and sorted coins
X4CryptoTable.prototype.refreshItemsPerPage = function() {
  var self = this;

  var perPage = self.options.perPage.value > 0
    ? self.options.perPage.value
    : self.options.coins.data.all.length;

  var start = self.options.pager.page * perPage;

  self.options.coins.data.page = self.options.coins.data.all.slice(start, start + perPage);
}

// render the table widgets and all related control elements
X4CryptoTable.prototype.renderWidget = function() {
  var self = this;

  var $loader = self.element.querySelector('.x4-loader');
  if ($loader) $loader.parentNode.removeChild($loader);

  // initialize header region
  var $header = document.createElement('div');
  $header.className = 'x4-header x4-clearfix';

  if (self.options.fiat.visible) {
    var $fiatSelect = self.initFiatSelect();
    $header.appendChild($fiatSelect);
  }

  if (self.options.perPage.visible) {
    var $perPage = self.initPerPage();
    $header.appendChild($perPage);
  }

  if (self.options.search.visible) {
    var $search = self.initSearch();
    $header.appendChild($search);
  }

  self.element.appendChild($header);

  // initialize tables region
  var $tables = document.createElement('div');
  $tables.className = 'x4-tables';

  var $table = self.initTable();
  $tables.appendChild($table);

  self.element.appendChild($tables);

  // initialize footer region
  var $footer = document.createElement('div');
  $footer.className = 'x4-footer x4-clearfix';

  if (self.options.pager.visible) {
    var $pager = self.initPager();
    $footer.appendChild($pager);
  }

  self.element.appendChild($footer);

  // initialize responsive
  self.initResponsive();
  self.initResponsiveTable($table);

  x4CryptoTables.tradeHook.push(self.changeTrade.bind(self));
}

// initialize fiat select box and bind its events
X4CryptoTable.prototype.initFiatSelect = function() {
  var self = this;

  var $fiatSelect = document.createElement('div');
  $fiatSelect.className = 'x4-fiat-select';

  if (self.options.fiat.icon) {
    var $icon = document.createElement('div');
    $icon.className = 'x4-prefix x4-icon x4-primary-fill';
    $icon.innerHTML = x4CryptoTables.icon_attach_money;

    $fiatSelect.className += ' x4-with-icon';
    $fiatSelect.appendChild($icon);
  }

  var $select = x4CryptoTables.uiSelect({
    value: self.options.fiat.value,
    values: self.options.fiat.items,
    label: self.options.fiat.label,
    onChange: function(fiat) {
      self.options.fiat.value = fiat;
      self.changeTable();
    },
  });

  $fiatSelect.appendChild($select);

  return $fiatSelect;
}

// initialize per page select box and bind its events
X4CryptoTable.prototype.initPerPage = function() {
  var self = this;

  var $perPage = document.createElement('div');
  $perPage.className = 'x4-per-page';

  if (self.options.perPage.icon) {
    var $icon = document.createElement('div');
    $icon.className = 'x4-prefix x4-icon x4-primary-fill';
    $icon.innerHTML = x4CryptoTables.icon_layers;
    $perPage.className += ' x4-with-icon';
    $perPage.appendChild($icon);
  }

  var $select = x4CryptoTables.uiSelect({
    value: self.options.perPage.value,
    values: self.options.perPage.items,
    label: self.options.perPage.label,
    onChange: function(perPage) {
      self.options.pager.page = 0;
      self.options.perPage.value = parseInt(perPage);
      self.refreshItems();
      self.changeTable();
    },
  });

  $perPage.appendChild($select);

  return $perPage;
}

// initialize search box and bind its events
X4CryptoTable.prototype.initSearch = function() {
  var self = this;

  var $search = document.createElement('div');
  $search.className = 'x4-search';

  if (self.options.search.icon) {
    var $icon = document.createElement('div');
    $icon.className = 'x4-icon x4-primary-fill';
    $icon.innerHTML = x4CryptoTables.icon_search;
    $search.className += ' x4-with-icon';
    $search.appendChild($icon);
  }

  var $input = x4CryptoTables.uiInput({
    type: 'search',
    value: self.options.search.value,
    label: self.options.search.label,
    onInput: function(value) {
      self.options.pager.page = 0;
      self.options.search.value = value;
      self.refreshItems();
      self.changeTable();
    },
  });

  $search.appendChild($input);

  return $search;
}

// initialize table block and bind its events
X4CryptoTable.prototype.initTable = function() {
  var self = this;

  var $table = document.createElement('div');
  $table.className = 'x4-table';

  if (self.options.chart.visible) {
    $table.className += ' x4-with-chart';
  }

  var columns = self.options.columns.items.map(function(field) {
    self.options.columns.schema[field].field = field;
    return self.options.columns.schema[field];
  })

  var $uiTable = x4CryptoTables.uiTable({
    key: 'short',
    items: self.options.coins.data.page,
    columns: columns,
    sortField: self.options.columns.sort.field,
    sortType: self.options.columns.sort.type,
    onRenderValue: function(item, column) {
      return self.renderValue(item.short, column, item);
    },
    onChangeSort: function(sortField, sortType) {
      self.options.columns.sort.field = sortField;
      self.options.columns.sort.type = sortType;
      self.options.pager.page = 0;
      self.refreshItems();
      self.changeTable();
    },
    onRowClick: function($row, item) {
      if (self.options.chart.visible) {
        self.checkTablePopup($row, item);
      }
    },
  })
  
  $table.appendChild($uiTable);

  return $table;
}

// change table contents using smooth effect
X4CryptoTable.prototype.changeTable = function() {
  var self = this;

  var $tables = self.element.querySelector('.x4-tables');
  var $oldTables = $tables.querySelectorAll('.x4-table');

  $oldTables.forEach(function($oldTable) {
    if ($oldTable.className.indexOf('x4-disappear') === -1) {
      $oldTable.className = $oldTable.className + ' x4-disappear';

      setTimeout(function() {
        $oldTable.parentNode.removeChild($oldTable);
      }, 300);
    }
  });

  var $newTable = self.initTable();
  $newTable.className += ' x4-appear';

  $tables.appendChild($newTable);

  setTimeout(function() {
    $newTable.className = $newTable.className.replace(' x4-appear', '');
  }, 10);

  if (self.options.pager.visible) {
    var $newPager = self.initPager();
    var $oldPager = self.element.querySelector('.x4-pager');
    $oldPager.parentNode.replaceChild($newPager, $oldPager);
  }

  self.initResponsiveTable($newTable);
}

// change table row contents using flashes effect
X4CryptoTable.prototype.changeTrade = function(change) {
  var self = this;

  if (change.price !== x4CryptoTables.front[change.short].price) {
    var $tr = self.element.querySelector('.x4-table .x4-row[data-value="' + change.short + '"]');

    if ($tr) {
      // initialize colors
      change.colors = change.price > x4CryptoTables.front[change.short].price
        ? [self.options.badges.colors.green1, self.options.badges.colors.green2]
        : [self.options.badges.colors.red1, self.options.badges.colors.red2];

      if (self.options.flashes.visible) {
        $tr.style.backgroundColor = change.price > x4CryptoTables.front[change.short].price
          ? self.options.flashes.colors.green
          : self.options.flashes.colors.red;

        setTimeout(function() {
          $tr.style.backgroundColor = '';
        }, 300);
      }

      // initialize flashes
      self.options.columns.items.forEach(function(field) {
        if (field === 'long') return;

        var $column = $tr.querySelector('.x4-column.x4-' + field);

        if ($column) {
          var column = self.options.columns.schema[field];
          var $oldValue = $column.querySelector('.x4-value');
          var $newValue = self.renderValue(change.short, column, change);
          $column.replaceChild($newValue, $oldValue);
        }
      });
    }
  }
}

// check if table popup exists, create if now, close if yes
X4CryptoTable.prototype.checkTablePopup = function($row, item) {
  var self = this;

  if ($row.nextSibling && $row.nextSibling.className.indexOf('x4-table-popup') !== -1) {
    // close already opened popup window
    var $popup = $row.nextSibling;
    var $inside = $popup.querySelector('.x4-inside2');

    $popup.style.height = 0;
    $inside.style.height = 0;
    $inside.style.paddingTop = 0;
    $inside.style.paddingBottom = 0;

    setTimeout(function() {
      $popup.parentNode.removeChild($popup);
    }, 200);
  } else {
    // open the new popup window
    var $popup = self.initTablePopup(item.short);

    if ($row.nextSibling) {
      $row.parentNode.insertBefore($popup, $row.nextSibling);
    } else {
      $row.parentNode.appendChild($popup);
    }

    setTimeout(function() {
      var $inside = $popup.querySelector('.x4-inside2');
      $popup.style.height = self.options.chart.boxHeight + 'px';
      $inside.style.height = self.options.chart.boxHeight + 'px';
    }, 10)

    var chartPeriod = self.options.chart.data.periods[item.short] || self.options.chart.period.value;
    x4CryptoTables.getHistory(item.short, chartPeriod, self.initChart.bind(self, $popup, item.short));
  }
}

// initialize table popup and bind its events
X4CryptoTable.prototype.initTablePopup = function(short) {
  var self = this;

  var $popup = document.createElement('div');
  $popup.className = 'x4-row x4-table-popup x4-loading';

  var $inside = document.createElement('div');
  $inside.className = 'x4-inside2';

  // initialize popup loader
  if (self.options.chart.loader) {
    var $loader = document.createElement('div');
    $loader.className = 'x4-loader2';

    var $uiLoader = x4CryptoTables.uiLoader();
    $loader.appendChild($uiLoader);

    $inside.appendChild($loader);
  }

  var $header = document.createElement('div');
  $header.className = 'x4-header x4-clearfix';

  // initialize chart property select box
  if (self.options.chart.property.visible) {
    var $chartProp = document.createElement('div');
    $chartProp.className = 'x4-chart-prop';

    var $chartPropSelect = x4CryptoTables.uiSelect({
      value: self.options.chart.data.fields[short] || self.options.chart.property.value,
      values: {
        items: self.options.chart.property.items.map(function(name) {
          self.options.chart.property.schema[name].field = name;
          return self.options.chart.property.schema[name];
        }),
        value: 'field',
        title: 'title',
      },
      label: self.options.chart.property.label,
      onChange: function(chartProp) {
        self.options.chart.data.fields[short] = chartProp;
        self.changeChart($popup, short);
      },
    })

    $chartProp.appendChild($chartPropSelect);
    $header.appendChild($chartProp);
  }
  
  // initialize chart period select box
  if (self.options.chart.period.visible) {
    var $chartPeriod = document.createElement('div');
    $chartPeriod.className = 'x4-chart-period';

    var $chartPeriodSelect = x4CryptoTables.uiSelect({
      value: self.options.chart.data.periods[short] || self.options.chart.period.value,
      values: {
        items: self.options.chart.period.items.map(function(name) {
          self.options.chart.period.schema[name].value = name;
          return self.options.chart.period.schema[name];
        }),
        value: 'value',
        title: 'title',
      },
      label: self.options.chart.period.label,
      onChange: function(chartPeriod) {
        self.options.chart.data.periods[short] = chartPeriod;
        $popup.className += ' x4-loading';
        x4CryptoTables.getHistory(short, chartPeriod, self.initChart.bind(self, $popup, short));
      },
    })

    $chartPeriod.appendChild($chartPeriodSelect);
    $header.appendChild($chartPeriod);
  }

  // initialize the chart container
  var $chart = document.createElement('div');
  $chart.className = 'x4-chart';
  $chart.style.height = self.options.chart.height + 'px';

  var $back = document.createElement('div');
  $back.className = 'x4-back';
  $back.innerHTML = short + '/' + self.options.fiat.value;

  var $canvas = document.createElement('canvas');
  $canvas.className = 'x4-canvas';
  $canvas.style.height = self.options.chart.height + 'px';
  $canvas.style.width = '100%';

  $chart.appendChild($back);
  $chart.appendChild($canvas);
  $inside.appendChild($header);
  $inside.appendChild($chart);
  $popup.appendChild($inside);

  return $popup;
}

// initialize chart block and bind its events
X4CryptoTable.prototype.initChart = function($popup, short) {
  var self = this;

  $popup.className = $popup.className.replace(' x4-loading', '');

  var $canvas = $popup.querySelector('.x4-canvas');
  var ctx = $canvas.getContext('2d');

  // rebuild chart instance
  if (ctx.chart) {
    ctx.chart.destroy();
    $canvas.removeAttribute('height');
    $canvas.removeAttribute('width');
  }

  var chartProp = self.options.chart.data.fields[short] || self.options.chart.property.value;
  var chartPeriod = self.options.chart.data.periods[short] || self.options.chart.period.value;

  // calculate dataset based on set of coins
  var data = x4CryptoTables.history[short][chartPeriod][chartProp]
    .filter(function(item, index) {
      return index % 5 === 0;
    })
    .map(function(item) {
      return {
        x: new Date(item[0]),
        y: item[1],
      };
    });

  // initialize Chart.js instance
  var chart = ctx.chart = new Chart.Line(ctx, {
    plugins: [
      this.getСrosshairPlugin($canvas),
    ],
    data: {
      datasets: [{ data: data }],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      legend: false,
      elements: {
        line: {
          borderColor: '#665B94',
          backgroundColor: 'rgba(102,91,148,.25)',
          fill: true,
          borderWidth: 1,
        },
        point: false,
      },
      // tooltip options
      tooltips: {
        mode: 'index',
        intersect: false,
        position: 'average',
        displayColors: false,
        bodyFontFamily: self.options.font.family,
        yPadding: 8,
        xPadding: 24,
        callbacks: {
          title: function(items, data) {
            return '';
          },
          label: function(item, data) {
            var value = data.datasets[0].data[item.index].y;
            var chartProp = self.options.chart.data.fields[short] || self.options.chart.property.value;
            var column = self.options.columns.schema[chartProp];
            column = column || { template: '', separator: ',', precision: 0 };
            return x4CryptoTables.formatPrice(self.options.fiat.value, column, value).replace(/(<([^>]+)>)/ig, '');
          },
        },
      },
      scales: {
        // horizontal scale options
        xAxes: [{
          type: 'time',
          display: true,
          position: 'bottom',
          id: 'x-axis',
          gridLines: {
            drawBorder: false,
            drawTicks: false,
            color: 'rgba(0,0,0,.06)',
          },
          ticks: {
            padding: 8,
            maxRotation: 0,
            fontFamily: self.options.font.family,
          },
        }],
        // vertical scale options
        yAxes: [{
          type: 'linear',
          display: true,
          position: 'right',
          gridLines: {
            color: 'rgba(0,0,0,.06)',
            drawBorder: false,
            drawTicks: false,
          },
          ticks: {
            padding: 4,
            fontFamily: self.options.font.family,
            callback: function(value) {
              if ($popup.offsetWidth < 600) {
                return '';
              }

              var chartProp = self.options.chart.data.fields[short] || self.options.chart.property.value;
              var column = self.options.columns.schema[chartProp];

              column = column || { template: '', separator: ',', precision: 0 };
              return ' ' + x4CryptoTables.formatPrice(self.options.fiat.value, column, value).replace(/(<([^>]+)>)/ig, '');
            },
          },
        }],
      },
    }
  });

  // make the chart responsive
  window.addEventListener('resize', function() {
    chart.resize();
  });

  chart.resize();
}

// replace chart data such as different cryptocurrency property
X4CryptoTable.prototype.changeChart = function($popup, short) {
  var self = this;

  $popup.className = $popup.className.replace(' x4-loading', '');

  var chartProp = self.options.chart.data.fields[short] || self.options.chart.property.value;
  var chartPeriod = self.options.chart.data.periods[short] || self.options.chart.period.value;
  
  // calculate dataset based on set of coins
  var data = x4CryptoTables.history[short][chartPeriod][chartProp]
    .filter(function(item, index) {
      return index % 5 === 0;
    })
    .map(function(item) {
      return {
        x: new Date(item[0]),
        y: item[1],
      };
    });

  var $canvas = $popup.querySelector('.x4-canvas');
  var ctx = $canvas.getContext('2d');

  if (ctx.chart) {
    ctx.chart.data.datasets[0].data = data;
    ctx.chart.update();
  }
}

// initialize pager block and bind its events
X4CryptoTable.prototype.initPager = function() {
  var self = this;

  var $pager = document.createElement('div');
  $pager.className = 'x4-pager';

  var perPage = self.options.perPage.value > 0
    ? self.options.perPage.value
    : self.options.coins.data.all.length;

  var start = self.options.pager.page * perPage + 1;
  var end = (self.options.pager.page + 1) * perPage;

  if (end > self.options.coins.data.all.length) {
    end = self.options.coins.data.all.length;
  }

  // stats label
  var $label = document.createElement('div');
  $label.className = 'x4-label';
  $label.innerHTML = 'Showing ' + start + '-' + end + ' of ' + self.options.coins.data.all.length + ' coins';

  // previous arrow button
  var $previous = document.createElement('div');
  $previous.className = 'x4-previous x4-icon' + (self.options.pager.page === 0 ? ' x4-disabled' : '');
  $previous.innerHTML = x4CryptoTables.icon_chevron_left;

  $previous.addEventListener('click', function() {
    if (self.options.pager.page > 0) {
      self.options.pager.page = self.options.pager.page - 1;
      self.refreshItemsPerPage();
      self.changeTable();
    }
  });

  var pagesCount = Math.ceil(self.options.coins.data.all.length / self.options.perPage.value);

  // next arrow button
  var $next = document.createElement('div');
  $next.className = 'x4-next x4-icon' + (self.options.pager.page === pagesCount - 1 ? ' x4-disabled' : '');
  $next.innerHTML = x4CryptoTables.icon_chevron_right;

  $next.addEventListener('click', function() {
    if (self.options.pager.page < pagesCount - 1) {
      self.options.pager.page = self.options.pager.page + 1;
      self.refreshItemsPerPage();
      self.changeTable();
    }
  });

  $pager.appendChild($label);
  $pager.appendChild($previous);
  $pager.appendChild($next);

  return $pager;
}

// initialize responsive widgets and controls
X4CryptoTable.prototype.initResponsive = function() {
  var self = this;

  var resize = function() {
    var $parent = self.options.width.desktop !== '100%'
      ? self.element.parentNode
      : self.element;

    var wtablet = $parent.offsetWidth < 960 ? ' x4-tablet' : '';
    var wmobile = $parent.offsetWidth < 600 ? ' x4-mobile' : '';

    if (!wtablet) {
      self.element.style.maxWidth = self.options.width.desktop;
      self.element.style.padding = self.options.padding.desktop;
    } else if (!wmobile) {
      self.element.style.maxWidth = self.options.width.tablet;
      self.element.style.padding = self.options.padding.tablet;
    } else {
      self.element.style.maxWidth = self.options.width.mobile;
      self.element.style.padding = self.options.padding.mobile;
    }

    var tablet = self.element.offsetWidth < 960 ? ' x4-tablet' : '';
    var mobile = self.element.offsetWidth < 600 ? ' x4-mobile' : '';

    self.element.className = self.element.className.replace(' x4-tablet', '').replace(' x4-mobile', '') + tablet + mobile;
  }

  resize();
  window.addEventListener('resize', resize);
}

// initialize responsive table elements and controls
X4CryptoTable.prototype.initResponsiveTable = function($table) {
  var self = this;

  self.options.columns.hidden = [];

  var resize = function() {
    var $inside = $table.querySelector('.x4-ui-table > .x4-inside');

    var columns = self.options.columns.hideOrder;
    var hidden = self.options.columns.hidden;

    if (Math.abs($table.offsetWidth - $inside.offsetWidth) > 4) {
      // hide columns if there is not enough space
      for (var i = 0; i < columns.length; i++) {
        var column = columns[i];

        if (hidden.indexOf(column) !== -1) {
          continue;
        }

        var $cells = $table.querySelectorAll('.x4-' + column);

        for (var j = 0; j < $cells.length; j++) {
          $cells[j].style.display = 'none';
        }

        hidden.push(column);

        if (Math.abs($table.offsetWidth - $inside.offsetWidth) <= 4) {
          break;
        }
      }
    } else if (hidden.length > 0) {
      // show columns if there is enough space for them
      for (var i = hidden.length - 1; i >= 0; i--) {
        var column = hidden[i];

        var $cells = $table.querySelectorAll('.x4-' + column);

        for (var j = 0; j < $cells.length; j++) {
          $cells[j].style.display = 'table-cell';
        }

        hidden.pop();

        if (Math.abs($table.offsetWidth - $inside.offsetWidth) > 4) {
          var $cells2 = $table.querySelectorAll('.x4-' + column);

          for (var j = 0; j < $cells2.length; j++) {
            $cells2[j].style.display = 'none';
          }

          hidden.push(column);

          break;
        }
      }
    }
  }

  setTimeout(resize, 100);

  window.addEventListener('resize', function() {
    if ($table.className.indexOf('x4-disappear') === -1) {
      setTimeout(resize, 100);
    }
  });
}

// render cryptocurrency value based on filters specified for table column
X4CryptoTable.prototype.renderValue = function(short, column, item) {
  var self = this;

  var $value = document.createElement('div');
  $value.className = 'x4-value';

  var field = column.field;
  var value = item[field];

  if (field === 'long') {
    value = x4CryptoTables.formatName(short, column, value);
  }

  if (['mktcap', 'price', 'vwapData', 'volume'].indexOf(field) !== -1) {
    value = x4CryptoTables.formatPrice(self.options.fiat.value, column, value);
  }

  if (['price', 'vwapData', 'perc'].indexOf(field) !== -1 && self.options.badges.visible) {
    self.styleColors(item, field, $value, value);
  }

  if (field === 'supply') {
    value = x4CryptoTables.formatSupply(column, value);
  }

  if (field === 'perc') {
    value = x4CryptoTables.formatPerc(column, value);
  }

  $value.innerHTML = value;

  return $value;
}

// initialize colors for green, red and grey badges
X4CryptoTable.prototype.styleColors = function(item, field, $value, value) {
  var self = this;

  $value.className += ' x4-badge';

  if (field === 'perc') {
    $value.style.backgroundColor = value >= 0
      ? value > 0
        ? self.options.badges.colors.green1
        : self.options.badges.colors.grey1
      : self.options.badges.colors.red1;

    $value.style.color = value >= 0
      ? value > 0
        ? self.options.badges.colors.green2
        : self.options.badges.colors.grey2
      : self.options.badges.colors.red2;
  } else {
    $value.style.backgroundColor = item.colors[0];
    $value.style.color = item.colors[1];
  }
}

// initialize a chart crosshair plugin
X4CryptoTable.prototype.getСrosshairPlugin = function($canvas) {
  var context = $canvas.getContext('2d');
  var drawing = false;
  var x, y = 0;

  return {

    // catch the chart events
    afterEvent: function(chart, event) {
      x = Math.round(event.x);
      y = Math.round(event.y);

      setTimeout(function() {
        if (!drawing) {
          chart.render({ duration: 0 });
        }
      }, 1);
    },

    // draw the crosshair
    afterDatasetsDraw: function(chart) {
      if (x < chart.chartArea.left || x > chart.chartArea.right) {
        return;
      }

      if (y < chart.chartArea.top || y > chart.chartArea.bottom) {
        return;
      }

      context.beginPath();
      context.lineWidth = 1;
      context.moveTo(x + 0.5, 0.5);
      context.lineTo(x + 0.5, $canvas.scrollHeight + 0.5);
      context.moveTo(0.5, y + 0.5);
      context.lineTo($canvas.scrollWidth + 0.5, y + 0.5);
      context.strokeStyle = 'rgba(244,67,54,.64)';
      context.stroke();
      context.closePath();
    },

    beforeRender: function(chart) {
      drawing = true;
    },

    afterRender: function(chart) {
      drawing = false;
    },

  };
}

// instantiate the main store and retreive the main data
var x4CryptoTables = new X4CryptoTables();
x4CryptoTables.getExchangeRates();

x4CryptoTables.getFront();
x4CryptoTables.getTrades();
