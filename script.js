// APIエンドポイント設定
const API_BASE_URL = "https://api.flightradar24.com/common/v1/airport.json";
const AIRPORT_CODE = "CTS";

// ページネーション設定
let currentPage = 1;
const totalPages = 5;
let allFlights = []; // 全フライトデータを保管
let sortOrder = "asc"; // 'asc' または 'desc'

// 国際線の判定に使用する国内空港コード
const DOMESTIC_AIRPORTS = [
  "HND",
  "NRT",
  "KIX",
  "FUK",
  "CTS",
  "ITM",
  "NGO",
  "KOJ",
  "OKA",
  "UKB",
  "KMQ",
  "SDJ",
  "TTJ",
  "KCZ",
  "TAK",
  "FSZ",
  "AOJ",
  "OKI",
  "NGS",
  "KUH",
  "IBR",
  "HNA",
  "NTQ",
  "MBE",
  "YGJ",
  "TNE",
  "WKJ",
  "AXT",
  "FUJ",
  "FKS",
  "IWJ",
  "KMJ",
  "OKE",
  "MMJ",
  "MYJ",
  "AKJ",
  "ISG",
  "KIJ",
  "TKS",
  "TKN",
  "SYO",
  "HIJ",
  "OBO",
  "IWK",
  "OKJ",
  "GAJ",
  "UBJ",
  "KUM",
  "NKM",
  "TSJ",
  "TOY",
  "KMI",
  "MMY",
  "MMB",
  "OIR",
  "ASJ",
  "AXJ",
  "ONJ",
  "OIT",
  "TRA",
  "IKI",
  "KKX",
  "SHM",
  "MMD",
  "KTD",
  "KKJ",
  "RIS",
  "HKD",
  "IZO",
  "HAC",
  "HSG",
  "TJH",
  "UEO",
  "SHB",
  "OKD",
  "OGN",
  "RNJ",
  "SHI",
  "MSJ",
  "AGJ",
  "FKJ",
  "RBJ",
  "HTR",
  "KJP",
  "HIW",
  "OIM",
  "SDS",
  "IEJ",
  "MYE",
  "OSA",
  "BPU",
  "QGU",
  "HHE",
  "IWO",
  "DNA",
  "KUJ",
  "MUS",
  "IHA",
  "IIN",
  "QUT",
];

// ページロード時に実行
document.addEventListener("DOMContentLoaded", () => {
  // 今日の日付を表示
  displayCurrentDate();
  loadFlightData();

  // 更新ボタンのイベントリスナー
  document.getElementById("refreshBtn").addEventListener("click", () => {
    currentPage = 1;
    loadFlightData();
  });

  // ソートボタンのイベントリスナー
  const sortBtn = document.getElementById("sortBtn");
  if (sortBtn) {
    sortBtn.addEventListener("click", () => {
      sortOrder = sortOrder === "asc" ? "desc" : "asc";
      sortFlightsByTime();
      currentPage = 1;
      displayFlightsForCurrentPage();
      updatePaginationButtons();
      updateSortButtonText();
    });
  }

  // 現在時刻ボタンのイベントリスナー
  const currentTimeBtn = document.getElementById("currentTimeBtn");
  if (currentTimeBtn) {
    currentTimeBtn.addEventListener("click", async () => {
      // データをリフレッシュしてから現在時刻にジャンプ
      await loadFlightData();
      jumpToCurrentTimeFlight();
    });
  }

  // ページネーションボタンのイベントリスナーを追加
  setupPaginationListeners();

  // 5分ごとに自動更新
  setInterval(loadFlightData, 5 * 60 * 1000);
});

// 今日の日付を表示
function displayCurrentDate() {
  const now = new Date();
  const dateString = now.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const dateElement = document.getElementById("currentDate");
  if (dateElement) {
    dateElement.textContent = `📅 ${dateString}`;
  }
}

// フライトデータを取得
async function loadFlightData() {
  const loadingElement = document.getElementById("loading");
  const errorElement = document.getElementById("error");
  const flightListElement = document.getElementById("flightList");
  const noFlightsElement = document.getElementById("noFlights");

  // UIをリセット
  loadingElement.style.display = "block";
  errorElement.style.display = "none";
  flightListElement.innerHTML = "";
  noFlightsElement.style.display = "none";

  try {
    // 全ページのデータを取得
    allFlights = [];

    // 今日の日付を取得（00:00:00から23:59:59まで）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = Math.floor(today.getTime() / 1000);
    const todayEnd = todayStart + (24 * 60 * 60) - 1;

    for (let page = 1; page <= totalPages; page++) {
      const apiUrl =
        // 予定時刻を過ぎた未到着便も取得できるよう、当日0時を基準にする。
        `${API_BASE_URL}?code=${AIRPORT_CODE}&plugin[]=schedule&plugin-setting[schedule][mode]=arrivals&plugin-setting[schedule][timestamp]=${todayStart}&limit=100&page=${page}`;

      console.log(`Fetching page ${page}:`, apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const arrivals =
        data.result?.response?.airport?.pluginData?.schedule?.arrivals?.data ||
        [];

      // 国際線かつ今日のフライトのみフィルタリング
      const internationalFlights = arrivals.filter((flight) => {
        const originCode = flight.flight?.airport?.origin?.code?.iata;
        const time = flight.flight?.time || {};

        // 到着時刻を取得（実際の到着 > 推定 > 予定の順で優先）
        const arrivalTime = time.real?.arrival || time.estimated?.arrival ||
          time.scheduled?.arrival;

        // 国際線かつ今日の日付のフライトのみ
        const isInternational = originCode &&
          !DOMESTIC_AIRPORTS.includes(originCode);
        // 翌日まで遅延した当日便も、予定日を基準に表示に残す。
        const isToday = [time.scheduled?.arrival, arrivalTime].some(
          (timestamp) => timestamp && timestamp >= todayStart &&
            timestamp <= todayEnd,
        );

        return isInternational && isToday;
      });

      allFlights = allFlights.concat(internationalFlights);
      console.log(
        `Page ${page}: ${internationalFlights.length} international flights (today only)`,
      );
    }

    console.log(`Total international flights (today): ${allFlights.length}`);

    // 時間でソート
    sortFlightsByTime();

    loadingElement.style.display = "none";
    updateLastUpdateTime();
    updateSortButtonText();

    if (allFlights.length === 0) {
      noFlightsElement.style.display = "block";
      updatePaginationButtons();
      return;
    }

    // 現在のページのフライトを表示
    displayFlightsForCurrentPage();
    updatePaginationButtons();
  } catch (error) {
    console.error("Error fetching flight data:", error);
    loadingElement.style.display = "none";
    errorElement.style.display = "block";
  }
}

// フライトを時間でソート
function sortFlightsByTime() {
  allFlights.sort((a, b) => {
    const timeA = getArrivalTime(a);
    const timeB = getArrivalTime(b);

    if (sortOrder === "asc") {
      return timeA - timeB;
    } else {
      return timeB - timeA;
    }
  });
}

// フライトの到着時刻を取得
function getArrivalTime(flight) {
  const time = flight.flight?.time || {};
  // 実際の到着 > 推定 > 予定の順で優先
  return time.real?.arrival || time.estimated?.arrival ||
    time.scheduled?.arrival || 0;
}

// ソートボタンのテキストを更新
function updateSortButtonText() {
  const sortBtn = document.getElementById("sortBtn");
  if (sortBtn) {
    if (sortOrder === "asc") {
      sortBtn.innerHTML = "🕐 時間順 (早→遅)";
    } else {
      sortBtn.innerHTML = "🕐 時間順 (遅→早)";
    }
  }
}

// 現在時刻に最も近いフライトにジャンプ
function jumpToCurrentTimeFlight() {
  if (allFlights.length === 0) {
    return;
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);

  // 現在時刻に最も近いフライトを探す
  let closestIndex = 0;
  let minTimeDiff = Math.abs(getArrivalTime(allFlights[0]) - currentTimestamp);

  allFlights.forEach((flight, index) => {
    const arrivalTime = getArrivalTime(flight);
    const timeDiff = Math.abs(arrivalTime - currentTimestamp);

    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestIndex = index;
    }
  });

  // 該当するページに移動
  const itemsPerPage = 20;
  const targetPage = Math.floor(closestIndex / itemsPerPage) + 1;
  currentPage = targetPage;

  // ページを更新
  displayFlightsForCurrentPage();
  updatePaginationButtons();

  // 該当フライトまでスクロール
  setTimeout(() => {
    const flightCards = document.querySelectorAll(".flight-card");
    const indexInPage = closestIndex % itemsPerPage;

    if (flightCards[indexInPage]) {
      flightCards[indexInPage].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // ハイライト効果を追加
      flightCards[indexInPage].classList.add("highlight");
      setTimeout(() => {
        flightCards[indexInPage].classList.remove("highlight");
      }, 2000);
    }
  }, 100);
}

// 現在のページのフライトを表示
function displayFlightsForCurrentPage() {
  const flightListElement = document.getElementById("flightList");
  flightListElement.innerHTML = "";

  const itemsPerPage = 20; // 1ページあたりの表示件数
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageFlights = allFlights.slice(startIndex, endIndex);

  const currentTimestamp = Math.floor(Date.now() / 1000);

  pageFlights.forEach((flight) => {
    const card = createFlightCard(flight, currentTimestamp);
    flightListElement.appendChild(card);
  });

  // フライトがない場合
  if (pageFlights.length === 0) {
    document.getElementById("noFlights").style.display = "block";
  }
}

// フライトカードを生成
function createFlightCard(flight, currentTimestamp = null) {
  const card = document.createElement("div");
  card.className = "flight-card";

  // 現在時刻に近いかチェック
  if (currentTimestamp) {
    const arrivalTime = getArrivalTime(flight);
    const timeDiff = Math.abs(arrivalTime - currentTimestamp);

    // 30分以内のフライトをハイライト
    if (timeDiff <= 30 * 60) {
      card.classList.add("near-current-time");
    }
  }

  // フライト情報を取得
  const flightInfo = flight.flight || {};
  const identification = flightInfo.identification || {};
  const status = flightInfo.status || {};
  const airport = flightInfo.airport || {};
  const aircraft = flightInfo.aircraft || {};
  const airline = flightInfo.airline || {};
  const time = flightInfo.time || {};

  // フライト番号
  const flightNumber = identification.number?.default || "N/A";
  const callsign = identification.callsign || "";

  // 航空会社
  const airlineName = airline.name || "Unknown Airline";

  // 空港情報
  const origin = airport.origin || {};
  const destination = airport.destination || {};
  const originCode = origin.code?.iata || "N/A";
  const originName = origin.name || "Unknown";
  const destCode = destination.code?.iata || "N/A";
  const destName = destination.name || "Unknown";

  // ステータス
  const statusText = status.text || "Scheduled";
  const statusClass = getStatusClass(statusText);

  // 時刻情報
  const scheduledTime = time.scheduled?.arrival || null;
  const estimatedTime = time.estimated?.arrival || null;
  const actualTime = time.real?.arrival || null;

  // 機体情報
  const aircraftModel = aircraft.model?.text || "N/A";
  const aircraftReg = aircraft.registration || "N/A";

  card.innerHTML = `

     <div class="time-section">
            ${
    scheduledTime
      ? `
                <div class="time-item">
                    <div class="time-label">⏰ 予定時刻</div>
                    <div class="time-value">${formatTime(scheduledTime)}</div>
                </div>
            `
      : ""
  }
            
            ${
    estimatedTime
      ? `
                <div class="time-item">
                    <div class="time-label">📊 推定時刻</div>
                    <div class="time-value time-estimated ${
        actualTime ? "" : "time-delayed"
      }">${formatTime(estimatedTime)}</div>
                </div>
            `
      : ""
  }
            
            ${
    actualTime
      ? `
                <div class="time-item">
                    <div class="time-label">✅ 実際の到着時刻</div>
                    <div class="time-value time-actual">${
        formatTime(actualTime)
      }</div>
                </div>
            `
      : ""
  }
        </div>
        <div class="flight-header">
            <div>
                <div class="flight-number">${flightNumber}</div>
                <div style="color: #666; font-size: 0.9em; margin-top: 5px;">${airlineName}</div>
            </div>
            <div class="status-badge ${statusClass}">${statusText}</div>
        </div>
        
        <div class="flight-route">
            <div class="origin">${originCode}</div>
            <div class="arrow">✈️</div>
            <div class="destination">CTS</div>
        </div>
        
        <div class="flight-details">
            <div class="detail-item">
                <div class="detail-label">出発地</div>
                <div class="detail-value">${originName}</div>
            </div>
        </div>
        
       
        
        <div class="aircraft-info">
            ✈️ 機体: ${aircraftModel} | 登録番号: ${aircraftReg}
        </div>
    `;

  return card;
}

// ステータスに応じたCSSクラスを取得
function getStatusClass(statusText) {
  const status = statusText.toLowerCase();

  if (status.includes("landed") || status.includes("arrived")) {
    return "status-landed";
  } else if (status.includes("delayed") || status.includes("diverted")) {
    return "status-delayed";
  } else if (status.includes("en route") || status.includes("airborne")) {
    return "status-enroute";
  } else {
    return "status-scheduled";
  }
}

// UNIXタイムスタンプを時刻フォーマットに変換
function formatTime(timestamp) {
  if (!timestamp) return "N/A";

  const date = new Date(timestamp * 1000);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

// 最終更新時刻を表示
function updateLastUpdateTime() {
  const now = new Date();
  const timeString = now.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  document.getElementById("lastUpdate").textContent = `最終更新: ${timeString}`;
}

// ページネーションボタンのセットアップ
function setupPaginationListeners() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        displayFlightsForCurrentPage();
        updatePaginationButtons();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const maxPage = Math.ceil(allFlights.length / 20);
      if (currentPage < maxPage) {
        currentPage++;
        displayFlightsForCurrentPage();
        updatePaginationButtons();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }
}

// ページネーションボタンの状態を更新
function updatePaginationButtons() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");

  const maxPage = Math.ceil(allFlights.length / 20) || 1;

  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= maxPage;
  }

  if (pageInfo) {
    pageInfo.textContent = `${currentPage} / ${maxPage}`;
  }
}
