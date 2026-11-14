'use strict';

var STORAGE_KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  THEME: 'ebv_theme',
  SPENDING_LIMIT: 'ebv_spending_limit'
};

var CATEGORY_COLORS = {
  Food: '#f58f7c',
  Transport: '#f2c4ce',
  Fun: '#d6d6d6'
};

var CATEGORIES = ['Food', 'Transport', 'Fun'];

var TRASH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"' +
  ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
  ' stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/>' +
  '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
  '<line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

var transactions = [];
var currentSort = 'newest';
var chart = null;
var animateNewItem = null;
var dom = {};

function loadTransactions() {
  try {
    var data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

function loadTheme() {
  var saved = localStorage.getItem(STORAGE_KEYS.THEME);
  if (saved === 'light' || saved === 'dark') return saved;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

function loadSpendingLimit() {
  var val = parseFloat(localStorage.getItem(STORAGE_KEYS.SPENDING_LIMIT));
  return isNaN(val) || val <= 0 ? 0 : val;
}

function saveSpendingLimit(limit) {
  localStorage.setItem(STORAGE_KEYS.SPENDING_LIMIT, String(limit));
}

function formatCurrency(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  var el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

function getCategoryTotals() {
  var totals = { Food: 0, Transport: 0, Fun: 0 };
  transactions.forEach(function (t) {
    totals[t.category] += t.amount;
  });
  return totals;
}

function getSortedTransactions() {
  var sorted = transactions.slice();
  switch (currentSort) {
    case 'oldest':
      sorted.sort(function (a, b) { return a.date - b.date; });
      break;
    case 'amountDesc':
      sorted.sort(function (a, b) { return b.amount - a.amount; });
      break;
    case 'amountAsc':
      sorted.sort(function (a, b) { return a.amount - b.amount; });
      break;
    case 'category':
      sorted.sort(function (a, b) { return a.category.localeCompare(b.category); });
      break;
    default:
      sorted.sort(function (a, b) { return b.date - a.date; });
  }
  return sorted;
}

function getSpendingLimit() {
  var val = parseFloat(dom.spendingLimit.value);
  return isNaN(val) || val <= 0 ? 0 : val;
}

function validateForm() {
  var valid = true;

  var name = dom.itemName.value.trim();
  var amount = parseFloat(dom.amount.value);
  var category = dom.category.value;

  if (!name) {
    dom.nameError.textContent = 'Item name is required';
    valid = false;
  } else {
    dom.nameError.textContent = '';
  }

  if (isNaN(amount) || amount <= 0) {
    dom.amountError.textContent = 'Enter a valid amount greater than 0';
    valid = false;
  } else {
    dom.amountError.textContent = '';
  }

  if (!category) {
    dom.categoryError.textContent = 'Please select a category';
    valid = false;
  } else {
    dom.categoryError.textContent = '';
  }

  return valid;
}

function renderBalance() {
  var total = transactions.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);
  dom.totalBalance.textContent = formatCurrency(total);

  var limit = getSpendingLimit();
  if (limit > 0 && total > limit) {
    dom.balanceCard.classList.add('over-limit');
    dom.balanceWarning.hidden = false;
    dom.balanceWarning.textContent =
      '⚠ Total exceeds spending limit by ' + formatCurrency(total - limit);
  } else {
    dom.balanceCard.classList.remove('over-limit');
    dom.balanceWarning.hidden = true;
  }

  dom.meterBlock.hidden = !(limit > 0);
  if (limit > 0) {
    var pct = (total / limit) * 100;
    dom.meterFill.style.width = Math.min(pct, 100) + '%';
    dom.meterText.textContent = Math.round(pct) + '% of your limit used (' +
      formatCurrency(total) + ' of ' + formatCurrency(limit) + ')';
  }

  var totals = getCategoryTotals();
  var top = CATEGORIES.slice().sort(function (a, b) { return totals[b] - totals[a]; })[0];
  dom.statCount.textContent = transactions.length;
  dom.statTop.textContent = transactions.length ? top : 'None yet';
  dom.statAvg.textContent = formatCurrency(transactions.length ? total / transactions.length : 0);
}

function renderList() {
  var sorted = getSortedTransactions();
  var limit = getSpendingLimit();

  dom.transactionList.innerHTML = '';

  if (sorted.length === 0) {
    dom.listEmpty.hidden = false;
    return;
  }
  dom.listEmpty.hidden = true;

  sorted.forEach(function (t) {
    var item = document.createElement('div');
    item.className = 'transaction-item';

    if (animateNewItem === t.id) {
      item.classList.add('animate-in');
    }

    if (limit > 0 && t.amount > limit) {
      item.classList.add('over-limit');
    }

    var badgeClass = 'badge-' + t.category.toLowerCase();

    item.innerHTML =
      '<div class="transaction-info">' +
      '<span class="transaction-name">' + escapeHtml(t.name) + '</span>' +
      '<div class="transaction-meta">' +
      '<span class="badge ' + badgeClass + '">' +
      '<span class="badge-dot"></span>' + t.category +
      '</span>' +
      '<span class="transaction-date">' + formatDate(t.date) + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="transaction-right">' +
      '<span class="transaction-amount">' + formatCurrency(t.amount) + '</span>' +
      '<button class="btn-delete" data-id="' + t.id + '" aria-label="Delete transaction">' +
      TRASH_SVG +
      '</button>' +
      '</div>';

    dom.transactionList.appendChild(item);
  });

  animateNewItem = null;
}

function getChartOptions() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  var textColor = isDark ? '#f1eeee' : '#2c2b30';
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          padding: 15,
          font: { size: 13, family: 'Inter, sans-serif' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            return ctx.label + ': ' + formatCurrency(ctx.parsed);
          }
        }
      }
    }
  };
}

function renderChart() {

  if (typeof Chart === 'undefined') return;

  var totals = getCategoryTotals();
  var activeCategories = CATEGORIES.filter(function (c) {
    return totals[c] > 0;
  });
  var data = activeCategories.map(function (c) { return totals[c]; });
  var colors = activeCategories.map(function (c) { return CATEGORY_COLORS[c]; });

  if (activeCategories.length === 0) {
    dom.chartWrapper.hidden = true;
    dom.chartEmpty.hidden = false;
    if (chart) {
      chart.destroy();
      chart = null;
    }
    return;
  }

  dom.chartWrapper.hidden = false;
  dom.chartEmpty.hidden = true;

  var borderColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--card-bg').trim();

  if (chart) {

    chart.data.labels = activeCategories;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.data.datasets[0].borderColor = borderColor;
    chart.options = getChartOptions();
    chart.update();
  } else {

    chart = new Chart(dom.pieChart, {
      type: 'pie',
      data: {
        labels: activeCategories,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 3,
          borderColor: borderColor
        }]
      },
      options: getChartOptions()
    });
  }
}

function renderAll() {
  renderBalance();
  renderList();
  renderChart();
}

function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  var newId = generateId();
  transactions.push({
    id: newId,
    name: dom.itemName.value.trim(),
    amount: parseFloat(dom.amount.value),
    category: dom.category.value,
    date: Date.now()
  });
  animateNewItem = newId;
  saveTransactions();

  dom.expenseForm.reset();
  dom.category.value = '';

  renderAll();
}

function handleDelete(e) {
  var btn = e.target.closest('.btn-delete');
  if (!btn) return;

  var item = btn.closest('.transaction-item');
  var id = btn.dataset.id;
  var removed = false;

  item.classList.add('removing');

  function remove() {
    if (removed) return;
    removed = true;
    transactions = transactions.filter(function (t) { return t.id !== id; });
    saveTransactions();
    renderAll();
  }

  item.addEventListener('animationend', remove, { once: true });

  setTimeout(remove, 300);
}

function handleThemeToggle() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  saveTheme(next);
  renderChart();
}

function handleSortChange() {
  currentSort = dom.sortBy.value;
  renderList();
}

function handleSpendingLimitChange() {
  saveSpendingLimit(getSpendingLimit());
  renderBalance();
  renderList();
}

function init() {

  dom.themeToggle = document.getElementById('themeToggle');
  dom.balanceCard = document.getElementById('balanceCard');
  dom.totalBalance = document.getElementById('totalBalance');
  dom.balanceWarning = document.getElementById('balanceWarning');
  dom.expenseForm = document.getElementById('expenseForm');
  dom.itemName = document.getElementById('itemName');
  dom.amount = document.getElementById('amount');
  dom.category = document.getElementById('category');
  dom.nameError = document.getElementById('nameError');
  dom.amountError = document.getElementById('amountError');
  dom.categoryError = document.getElementById('categoryError');
  dom.spendingLimit = document.getElementById('spendingLimit');
  dom.chartWrapper = document.getElementById('chartWrapper');
  dom.pieChart = document.getElementById('pieChart');
  dom.chartEmpty = document.getElementById('chartEmpty');
  dom.sortBy = document.getElementById('sortBy');
  dom.transactionList = document.getElementById('transactionList');
  dom.listEmpty = document.getElementById('listEmpty');
  dom.meterBlock = document.getElementById('meterBlock');
  dom.meterFill = document.getElementById('meterFill');
  dom.meterText = document.getElementById('meterText');
  dom.statCount = document.getElementById('statCount');
  dom.statTop = document.getElementById('statTop');
  dom.statAvg = document.getElementById('statAvg');

  transactions = loadTransactions();
  currentSort = 'newest';

  var theme = document.documentElement.getAttribute('data-theme');
  saveTheme(theme);

  var limit = loadSpendingLimit();
  dom.spendingLimit.value = limit > 0 ? limit : '';

  dom.expenseForm.addEventListener('submit', handleSubmit);
  dom.transactionList.addEventListener('click', handleDelete);
  dom.themeToggle.addEventListener('click', handleThemeToggle);
  dom.sortBy.addEventListener('change', handleSortChange);
  dom.spendingLimit.addEventListener('input', handleSpendingLimitChange);

  dom.itemName.addEventListener('input', function () {
    dom.nameError.textContent = '';
  });
  dom.amount.addEventListener('input', function () {
    dom.amountError.textContent = '';
  });
  dom.category.addEventListener('change', function () {
    dom.categoryError.textContent = '';
  });

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);