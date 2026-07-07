/**
 * 리스/렌트 계산기 — 금리 역산 + 월납입금 산출
 * acquisition - prepay = monthly * [1-(1+r)^-n]/r + residual * (1+r)^-n
 */
(function () {
  'use strict';

  var activeTab = 'rate';
  var lastCalcSnapshot = null;
  var FIXED_ANNUAL_RATE_PCT = 3;

  function parseNum(v) {
    var n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function formatNum(n) {
    return Math.round(n).toLocaleString('ko-KR');
  }

  function formatMoneyInput(el) {
    if (!el || el.dataset.fmtBound) return;
    el.dataset.fmtBound = '1';
    el.addEventListener('input', function () {
      var raw = parseNum(this.value);
      this.value = raw ? formatNum(raw) : '';
    });
  }

  function getTabFromUrl() {
    var tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'monthly' ? 'monthly' : 'rate';
  }

  function presentValue(r, n, monthly, residual) {
    if (Math.abs(r) < 1e-9) return monthly * n + residual;
    var df = Math.pow(1 + r, -n);
    return monthly * (1 - df) / r + residual * df;
  }

  function solveRate(n, monthly, acquisition, residual, prepay) {
    var target = acquisition - prepay;
    var lo = 0;
    var hi = 0.05;
    var fLo = presentValue(lo, n, monthly, residual) - target;
    var guard = 0;
    var fHi = presentValue(hi, n, monthly, residual) - target;

    while (fLo * fHi > 0 && guard < 40) {
      hi += 0.05;
      fHi = presentValue(hi, n, monthly, residual) - target;
      guard++;
    }
    if (fLo * fHi > 0) return null;

    for (var i = 0; i < 100; i++) {
      var mid = (lo + hi) / 2;
      var fMid = presentValue(mid, n, monthly, residual) - target;
      if (Math.abs(fMid) < 1e-6) return mid;
      if (fLo * fMid < 0) {
        hi = mid;
        fHi = fMid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }
    return (lo + hi) / 2;
  }

  function calcMonthlyPayment(n, acquisition, residual, prepay, annualRatePct) {
    var target = acquisition - prepay;
    var r = annualRatePct / 12 / 100;
    if (!n || !acquisition || acquisition <= prepay) return null;
    if (Math.abs(r) < 1e-12) return (target - residual) / n;
    var df = Math.pow(1 + r, -n);
    var pvResidual = residual * df;
    var annuity = (1 - df) / r;
    if (annuity <= 0) return null;
    return (target - pvResidual) / annuity;
  }

  function syncSharedFields(toTab) {
    if (toTab === 'monthly') {
      document.getElementById('mPeriod').value = document.getElementById('period').value;
      document.getElementById('mAcquisition').value = document.getElementById('acquisition').value;
      document.getElementById('mResidual').value = document.getElementById('residual').value;
      document.getElementById('mPrepay').value = document.getElementById('prepay').value;
    } else {
      document.getElementById('period').value = document.getElementById('mPeriod').value;
      document.getElementById('acquisition').value = document.getElementById('mAcquisition').value;
      document.getElementById('residual').value = document.getElementById('mResidual').value;
      document.getElementById('prepay').value = document.getElementById('mPrepay').value;
    }
  }

  function updateHeroCopy(tab) {
    var title = document.getElementById('calcHeroTitle');
    var desc = document.getElementById('calcHeroDesc');
    var warn = document.getElementById('calcHeroWarnText');
    if (tab === 'monthly') {
      title.innerHTML = '<span class="grad">조건만 넣으면, 월 납입금 10초 컷!</span>';
      desc.textContent = '취득원가, 잔존가치만 입력하면 예상 월 납입금을 바로 확인할 수 있습니다. 견적서의 월 납입금이 합리적인지 간단하게 비교해 보세요.';
      warn.textContent = '담당자가 안내한 월 납입금이 조건 대비 적정한지, 아래에서 직접 계산해 간단하게 확인해 보세요.';
    } else {
      title.innerHTML = '<span class="grad">내 견적, 금리. 이율. 10초면 검증 끝!</span>';
      desc.textContent = '취득원가, 잔존가치, 월 납입금만 입력하면 숨어있는 실제 금리와 총 이자비용을 바로 확인할 수 있습니다. 리스·렌트 견적서에는 금리가 따로 표기되지 않는다는 이유로 허위 금리를 안내받는 피해 사례가 늘고 있습니다.';
      warn.textContent = '담당자가 안내해 준 금리·이자가 내가 알고 있는 조건과 맞는지, 아래에서 직접 계산해 간단하게 확인해 보세요.';
    }
  }

  function switchCalcTab(tab, pushUrl) {
    activeTab = tab === 'monthly' ? 'monthly' : 'rate';
    syncSharedFields(activeTab);

    document.querySelectorAll('[data-calc-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.calcTab === activeTab);
    });
    document.getElementById('panelRate').hidden = activeTab !== 'rate';
    document.getElementById('panelMonthly').hidden = activeTab !== 'monthly';
    updateHeroCopy(activeTab);

    if (pushUrl) {
      var url = new URL(window.location.href);
      if (activeTab === 'monthly') url.searchParams.set('tab', 'monthly');
      else url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    document.querySelectorAll('.category-nav-submenu a[data-calc-link]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.calcLink === activeTab);
    });
  }

  function resetRateResults() {
    document.getElementById('rRate').innerHTML = '-<span class="unit-s">%</span>';
    document.getElementById('rTotal').innerHTML = '-<span class="unit-s">원</span>';
    document.getElementById('rMonthlyInt').innerHTML = '-<span class="unit-s">원</span>';
    document.getElementById('rTotalInt').innerHTML = '-<span class="unit-s">원</span>';
  }

  function resetMonthlyResults() {
    document.getElementById('mMonthly').innerHTML = '-<span class="unit-s">원</span>';
  }

  function buildCalcSnapshot(resultsOverride) {
    if (activeTab === 'monthly') {
      var n = parseNum(document.getElementById('mPeriod').value);
      var acquisition = parseNum(document.getElementById('mAcquisition').value);
      var residual = parseNum(document.getElementById('mResidual').value);
      var prepay = parseNum(document.getElementById('mPrepay').value) || 0;
      var annualRate = FIXED_ANNUAL_RATE_PCT;
      return {
        calculator_type: 'monthly',
        inputs: {
          period: n,
          annual_rate_pct: annualRate,
          acquisition: acquisition,
          residual: residual,
          prepay: prepay
        },
        results: resultsOverride || (lastCalcSnapshot && lastCalcSnapshot.results) || { calculated: false }
      };
    }

    return {
      calculator_type: 'rate',
      inputs: {
        period: parseNum(document.getElementById('period').value),
        monthly: parseNum(document.getElementById('monthly').value),
        acquisition: parseNum(document.getElementById('acquisition').value),
        residual: parseNum(document.getElementById('residual').value),
        prepay: parseNum(document.getElementById('prepay').value) || 0
      },
      results: resultsOverride || (lastCalcSnapshot && lastCalcSnapshot.results) || { calculated: false }
    };
  }

  function runRateCalc(showAlert) {
    var n = parseNum(document.getElementById('period').value);
    var monthly = parseNum(document.getElementById('monthly').value);
    var acquisition = parseNum(document.getElementById('acquisition').value);
    var residual = parseNum(document.getElementById('residual').value);
    var prepay = parseNum(document.getElementById('prepay').value) || 0;

    if (!n || !monthly || !acquisition || acquisition <= prepay) {
      resetRateResults();
      lastCalcSnapshot = buildCalcSnapshot({ calculated: false });
      if (showAlert) alert('리스기간, 월 납입금, 취득원가, 잔존가치를 정확히 입력해주세요.');
      return null;
    }

    var r = solveRate(n, monthly, acquisition, residual, prepay);
    if (r === null) {
      resetRateResults();
      lastCalcSnapshot = buildCalcSnapshot({ calculated: false });
      if (showAlert) alert('입력 값으로 금리를 계산할 수 없습니다. 입력값을 다시 확인해주세요.');
      return null;
    }

    var annualRatePct = r * 12 * 100;
    var totalCost = monthly * n + prepay;
    var principal = acquisition - prepay - residual;
    var totalInterest = monthly * n - principal;
    var monthlyInterestAvg = totalInterest / n;

    document.getElementById('rRate').innerHTML = annualRatePct.toFixed(2) + '<span class="unit-s">%</span>';
    document.getElementById('rTotal').innerHTML = formatNum(totalCost) + '<span class="unit-s">원</span>';
    document.getElementById('rMonthlyInt').innerHTML = formatNum(monthlyInterestAvg) + '<span class="unit-s">원</span>';
    document.getElementById('rTotalInt').innerHTML = formatNum(totalInterest) + '<span class="unit-s">원</span>';

    lastCalcSnapshot = buildCalcSnapshot({
      calculated: true,
      annual_rate_pct: parseFloat(annualRatePct.toFixed(4)),
      total_cost: Math.round(totalCost),
      monthly_interest: Math.round(monthlyInterestAvg),
      total_interest: Math.round(totalInterest)
    });
    return lastCalcSnapshot;
  }

  function runMonthlyCalc(showAlert) {
    var n = parseNum(document.getElementById('mPeriod').value);
    var acquisition = parseNum(document.getElementById('mAcquisition').value);
    var residual = parseNum(document.getElementById('mResidual').value);
    var prepay = parseNum(document.getElementById('mPrepay').value) || 0;
    var annualRate = FIXED_ANNUAL_RATE_PCT;

    if (!n || !acquisition || acquisition <= prepay) {
      resetMonthlyResults();
      lastCalcSnapshot = buildCalcSnapshot({ calculated: false });
      if (showAlert) alert('리스기간, 취득원가, 잔존가치를 정확히 입력해주세요.');
      return null;
    }

    var monthly = calcMonthlyPayment(n, acquisition, residual, prepay, annualRate);
    if (monthly === null || !isFinite(monthly) || monthly < 0) {
      resetMonthlyResults();
      lastCalcSnapshot = buildCalcSnapshot({ calculated: false });
      if (showAlert) alert('입력 값으로 월 납입금을 계산할 수 없습니다. 입력값을 다시 확인해주세요.');
      return null;
    }

    monthly = Math.round(monthly);

    document.getElementById('mMonthly').innerHTML = formatNum(monthly) + '<span class="unit-s">원</span>';

    lastCalcSnapshot = buildCalcSnapshot({
      calculated: true,
      monthly_payment: monthly
    });
    return lastCalcSnapshot;
  }

  function openQuoteModal() {
    lastCalcSnapshot = buildCalcSnapshot();
    document.getElementById('quoteModal').classList.add('open');
    document.getElementById('quoteModal').setAttribute('aria-hidden', 'false');
    document.getElementById('quoteName').focus();
  }

  function closeQuoteModal() {
    document.getElementById('quoteModal').classList.remove('open');
    document.getElementById('quoteModal').setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['monthly', 'acquisition', 'residual', 'prepay', 'mAcquisition', 'mResidual', 'mPrepay'].forEach(function (id) {
      formatMoneyInput(document.getElementById(id));
    });

    switchCalcTab(getTabFromUrl(), false);

    document.querySelectorAll('[data-calc-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchCalcTab(btn.dataset.calcTab, true);
      });
    });

    document.getElementById('calcBtn').addEventListener('click', function () {
      runRateCalc(true);
    });

    document.getElementById('calcMonthlyBtn').addEventListener('click', function () {
      runMonthlyCalc(true);
    });

    document.getElementById('btnOpenQuoteModal').addEventListener('click', function (e) {
      e.preventDefault();
      openQuoteModal();
    });

    document.getElementById('quoteModalClose').addEventListener('click', closeQuoteModal);
    document.getElementById('quoteModal').addEventListener('click', function (e) {
      if (e.target.id === 'quoteModal') closeQuoteModal();
    });

    document.getElementById('btnQuoteModalSubmit').addEventListener('click', async function () {
      var name = document.getElementById('quoteName').value.trim();
      var phone = document.getElementById('quotePhone').value.trim();
      if (!name) {
        alert('성함을 입력해 주세요.');
        return;
      }
      if (!phone || phone.replace(/\D/g, '').length < 9) {
        alert('연락처를 올바르게 입력해 주세요.');
        return;
      }
      if (!document.getElementById('quoteConsent').checked) {
        alert('개인정보 수집·이용에 동의해 주세요.');
        return;
      }

      var dataApi = window.PurpleLeaseData;
      if (!dataApi || !dataApi.isConfigured()) {
        alert('문의 접수 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      var btn = document.getElementById('btnQuoteModalSubmit');
      btn.disabled = true;
      btn.textContent = '접수 중…';

      try {
        await dataApi.submitLeaseCalculatorInquiry({
          name: name,
          phone: phone,
          calc_json: buildCalcSnapshot(),
          source_page: 'lease-calculator'
        });
        alert('견적 문의가 접수되었습니다. 담당 플래너가 곧 연락드리겠습니다.');
        document.getElementById('quoteName').value = '';
        document.getElementById('quotePhone').value = '';
        document.getElementById('quoteConsent').checked = false;
        closeQuoteModal();
      } catch (err) {
        console.warn('[lease-calculator] submit failed:', err);
        alert(err.message || '문의 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        btn.disabled = false;
        btn.textContent = '무료 견적 받아보기';
      }
    });
  });
})();
