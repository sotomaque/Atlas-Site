// initialize click event on tabs for examples
function initTabs() {
  var items = document.querySelectorAll('#examples > .example > .tabs > .tab');

  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('click', function(event) {
      initTabActive(this);
    })
  }
}

// remove old and add new active class for tabs
function initTabActive(newitem) {
  if (!newitem) {
    return;
  }

  var tab = newitem.getAttribute('data-tab')
  var oldItem = newitem.parentNode.querySelector('.active');
  var oldContent = newitem.parentNode.parentNode.querySelector('.contents .active');
  var newContent = newitem.parentNode.parentNode.querySelector('.content[data-content="' + tab + '"]');

  if (oldItem) {
    oldItem.className = oldItem.className.replace(' active', '');
  }

  if (oldContent) {
    oldContent.className = oldContent.className.replace(' active', '');
  }

  if (newContent) {
    newContent.className += ' active';
  }

  newitem.className += ' active';
}

// highlight code snippets
function initHighlighter() {
  SyntaxHighlighter.defaults['toolbar'] = false;
  SyntaxHighlighter.all();
}

// initialize example blocks
function initExamples() {
  initExample1();
  initExample2();
  initExample3();
  initExample4();
  initExample5();
  initExample6();
  initExample7();
  initExample8();
  initExample9();
  initExample10();
}

// initialize example block #1
function initExample1() {
  new X4CryptoTable('#example1', {
    fiat: {
      value: 'USD',
    },
    perPage: {
      value: 20,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
}

// initialize example block #2
function initExample2() {
  new X4CryptoTable('#example2', {
    fiat: {
      value: 'EUR',
    },
    perPage: {
      value: 10,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
    columns: {
      items: ['long', 'mktcap', 'price', 'vwapData', 'perc'],
    },
  });
}

// initialize example block #3
function initExample3() {
  new X4CryptoTable('#example31', {
    width: {
      desktop: '50%',
      tablet: '50%',
      mobile: '100%',
    },
    padding: {
      desktop: '0 4%',
      tablet: '0 2%',
      mobile: '0',
    },
    chart: {
      visible: false,
    },
    fiat: {
      visible: false,
    },
    perPage: {
      visible: false,
      value: 5,
    },
    search: {
      visible: false,
    },
    pager: {
      visible: false,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
  new X4CryptoTable('#example32', {
    width: {
      desktop: '50%',
      tablet: '50%',
      mobile: '100%',
    },
    padding: {
      desktop: '0 4%',
      tablet: '0 2%',
      mobile: '24px 0 0',
    },
    chart: {
      visible: false,
    },
    fiat: {
      visible: false,
    },
    perPage: {
      visible: false,
      value: 5,
    },
    search: {
      visible: false,
    },
    pager: {
      visible: false,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
}

// initialize example block #4
function initExample4() {
  new X4CryptoTable('#example41', {
    width: {
      desktop: '33.33%',
      tablet: '50%',
      mobile: '100%',
    },
    padding: {
      desktop: '0 2%',
      tablet: '0 2%',
      mobile: '0',
    },
    chart: {
      visible: false,
    },
    fiat: {
      visible: false,
    },
    perPage: {
      visible: false,
      value: 5,
    },
    search: {
      visible: false,
    },
    pager: {
      visible: false,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
  new X4CryptoTable('#example42', {
    width: {
      desktop: '33.33%',
      tablet: '50%',
      mobile: '100%',
    },
    padding: {
      desktop: '0 2%',
      tablet: '0 2%',
      mobile: '24px 0 0',
    },
    chart: {
      visible: false,
    },
    fiat: {
      visible: false,
    },
    perPage: {
      visible: false,
      value: 5,
    },
    search: {
      visible: false,
    },
    pager: {
      visible: false,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
  new X4CryptoTable('#example43', {
    width: {
      desktop: '33.33%',
      tablet: '100%',
      mobile: '100%',
    },
    padding: {
      desktop: '0 2%',
      tablet: '24px 2% 0',
      mobile: '24px 0 0',
    },
    chart: {
      visible: false,
    },
    fiat: {
      visible: false,
    },
    perPage: {
      visible: false,
      value: 5,
    },
    search: {
      visible: false,
    },
    pager: {
      visible: false,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
}

// initialize example block #5
function initExample5() {
  new X4CryptoTable('#example5', {
    search: {
      value: 'Ethereum',
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
}

// initialize example block #6
function initExample6() {
  new X4CryptoTable('#example6', {
    coins: {
      strategy: 'exclude_all',
      except: ['BTC', 'ETH', 'XRP', 'LTC', 'NEO', 'ADA', 'XLM', 'XMR'],
    },
    columns: {
      sort: {
        field: 'price',
        type: 'desc',
      },
    },
    fiat: {
      visible: false,
    },
    perPage: {
      visible: false,
    },
    search: {
      visible: false,
    },
    pager: {
      visible: false,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
}

// initialize example block #7
function initExample7() {
  new X4CryptoTable('#example7', {
    chart: {
      property: {
        value: 'volume',
      },
      period: {
        value: '365day',
      },
    },
    perPage: {
      value: 10,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
}

// initialize example block #8
function initExample8() {
  new X4CryptoTable('#example8', {
    columns: {
      schema: {
        long: {
          template: '[short] ([long])',
        },
      },
    },
    flashes: {
      visible: false,
    },
    badges: {
      visible: false,
    },
    perPage: {
      value: 10,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
}

// initialize example block #9
function initExample9() {
  new X4CryptoTable('#example9', {
    perPage: {
      value: 10,
    },
    flashes: {
      colors: {
        green: 'rgba(224,247,250,.5)',
        red: 'rgba(243,229,245,.5)',
      },
    },
    badges: {
      colors: {
        green1: '#E0F7FA',
        green2: '#00BCD4',
        red1: '#F3E5F5',
        red2: '#9C27B0',
      },
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
}

// initialize example block #10
function initExample10() {
  new X4CryptoTable('#example10', {
    fiat: {
      value: 'EUR',
    },
    columns: {
      schema: {
        long: {
          template: '[icon][short]',
        },
        mktcap: {
          template: '[value] [abbreviation]',
          separator: ' ',
        },
        price: {
          separator: '',
          precision: 4,
        },
        supply: {
          factor: 'K',
        },
        volume: {
          separator: '.',
        },
      },
    },
    perPage: {
      value: 10,
    },
    font: {
      family: 'Roboto, sans-serif',
    },
  });
}

initTabs();
initExamples();
initHighlighter();
