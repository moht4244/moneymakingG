/* Clearly fake example data for ?mock=1 preview. Not live desk data. */
(function (global) {
  const NOW = Date.now();
  const WALLET = "Demo1111111111111111111111111111111111111111";

  const MINTS = {
    demodog: "MockDemoDog22222222222222222222222222222",
    example: "MockExamp1eCoin11111111111111111111111111",
    fakepepe: "MockFakePepe3333333333333333333333333333",
    blocked: "MockRugBlocked44444444444444444444444444",
    sol: "MockMajorSOL11111111111111111111111111111",
    jup: "MockMajorJUP11111111111111111111111111111"
  };

  function series(n, start, end, wobble, key) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const wave = Math.sin(i / 3.4) * wobble + Math.sin(i / 9.1) * wobble * 0.4;
      const v = start + (end - start) * t + wave;
      const o = { t: NOW - (n - 1 - i) * 60 * 1000 };
      o[key] = Math.max(0, v);
      pts.push(o);
    }
    return pts;
  }

  const equityToday = series(90, 1000, 1084.4, 8, "equity");
  const equity7d = series(84, 1000, 1084.4, 18, "equity");
  const equity30d = series(60, 1000, 1084.4, 28, "equity");

  const demodogPx = series(80, 0.00018, 0.000242, 0.000008, "p");
  const examplePx = series(80, 0.0018, 0.00152, 0.00005, "p");
  const fakepepePx = series(80, 0.00004, 0.000061, 0.000003, "p");
  const solPx = series(80, 138.4, 142.6, 1.1, "p");
  const jupPx = series(80, 0.38, 0.412, 0.008, "p");

  const bots = [
    { name: "scanner", label: "Scanner", status: "running", last: "Såg 14 nya exempel-coins de senaste 10 minuterna", ts: NOW - 40 * 1000 },
    { name: "analyst", label: "Analyst", status: "running", last: "Kollade säkerheten på DEMODOG — alla 8 steg godkända (exempel)", ts: NOW - 2 * 60 * 1000 },
    { name: "brain", label: "Brain", status: "idle", last: "Storlek 3% av kassan på DEMODOG — exempelröst 61 mot 39", ts: NOW - 8 * 60 * 1000 },
    { name: "executor", label: "Executor", status: "idle", last: "Köpte DEMODOG för $32.00 (låtsas, PAPER)", ts: NOW - 12 * 60 * 1000 },
    { name: "risk", label: "Risk", status: "running", last: "Marknadsläge GRÖNT — BTC och SOL visar grönt (exempel)", ts: NOW - 90 * 1000 },
    { name: "research", label: "Research", status: "idle", last: "Dagens anteckning: större coins lugna, memecoins mer livliga (exempel)", ts: NOW - 25 * 60 * 1000 },
    { name: "whale", label: "Whale", status: "running", last: "Exempel-val A håller fortfarande DEMODOG", ts: NOW - 6 * 60 * 1000 },
    { name: "sentiment", label: "Sentiment", status: "running", last: "Humöret i nyheter: försiktigt positivt (exempel +0,32)", ts: NOW - 4 * 60 * 1000 },
    { name: "rug_guard", label: "Rug Guard", status: "running", last: "Bevakar 3 coins vi äger — ingen nödsälj", ts: NOW - 70 * 1000 },
    { name: "portfolio", label: "Portfolio", status: "idle", last: "Fördelning 43% memecoins / 57% större coins — ingen justering", ts: NOW - 35 * 60 * 1000 },
    { name: "reviewer", label: "Reviewer", status: "idle", last: "Förslag: sänk memecoin-storleken till 2,5% efter EXMP-stoppet (väntar på dig)", ts: NOW - 5 * 60 * 60 * 1000 }
  ];

  const positions = [
    {
      mint: MINTS.demodog,
      symbol: "DEMODOG",
      name: "Demo Dog (exempel)",
      qty: 132231.4,
      entry_usd: 0.00021,
      mark_usd: 0.000242,
      pnl_usd: 4.23,
      pnl_pct: 15.24,
      size_usd: 32.0,
      value_usd: 32.0 * 1.1524,
      opened_at: NOW - 16 * 60 * 1000,
      lane: "memecoins"
    },
    {
      mint: MINTS.fakepepe,
      symbol: "FPEPE",
      name: "Fake Pepe (exempel)",
      qty: 410000,
      entry_usd: 0.00005,
      mark_usd: 0.000061,
      pnl_usd: 4.51,
      pnl_pct: 22.0,
      size_usd: 20.5,
      value_usd: 25.01,
      opened_at: NOW - 3 * 60 * 60 * 1000,
      lane: "memecoins"
    },
    {
      mint: MINTS.sol,
      symbol: "SOL",
      name: "Solana (exempel)",
      qty: 0.58,
      entry_usd: 138.4,
      mark_usd: 142.6,
      pnl_usd: 2.44,
      pnl_pct: 3.03,
      size_usd: 80.27,
      value_usd: 82.71,
      opened_at: NOW - 26 * 60 * 60 * 1000,
      lane: "majors"
    }
  ];

  const watching = [
    { mint: MINTS.example, symbol: "EXMP", name: "Example Coin", score: 61, reason: "Bevakar — lite pengar i poolen (exempel)", lane: "memecoins" },
    { mint: MINTS.jup, symbol: "JUP", name: "Jupiter (exempel)", score: 70, reason: "Större coins — bevakar en liten nedgång (exempel)", lane: "majors" }
  ];

  const copyPicks = [
    { wallet: "Examp1eWhale11111111111111111111111111", label: "Exempel-val A", last: "Köpte DEMODOG för 12 min sedan (exempel)" },
    { wallet: "Examp1eWhale22222222222222222222222222", label: "Exempel-val B", last: "Inga nya köp idag (exempel)" }
  ];

  const activity = [
    { id: "a0", ts: NOW - 70 * 1000, kind: "guard", title: "Rug Guard: allt lugnt", body: "Bevakar 3 coins vi äger. Ingen nödsälj (exempel).", bot: "rug_guard" },
    { id: "a1", ts: NOW - 40 * 1000, kind: "scan", mint: MINTS.example, symbol: "EXMP", title: "Skannade EXMP", body: "Example Coin skickad vidare till Analyst (exempel).", bot: "scanner", lane: "memecoins" },
    { id: "a2", ts: NOW - 2 * 60 * 1000, kind: "system", title: "Analyst klar med DEMODOG", body: "Alla 8 säkerhetskontroller godkända. Betyg A.", bot: "analyst", mint: MINTS.demodog, symbol: "DEMODOG", lane: "memecoins" },
    { id: "a3", ts: NOW - 8 * 60 * 1000, kind: "system", title: "Brain satte storlek på DEMODOG", body: "Exempelröst: 61 för köp, 39 emot. Storlek 3% av kassan.", bot: "brain", mint: MINTS.demodog, symbol: "DEMODOG", lane: "memecoins" },
    { id: "a4", ts: NOW - 12 * 60 * 1000, kind: "buy", mint: MINTS.demodog, symbol: "DEMODOG", title: "KÖP DEMODOG · PAPER", body: "Köpt för $32.00 vid $0.000210 (låtsas).", pnl_usd: 0, bot: "executor", lane: "memecoins" },
    { id: "asent", ts: NOW - 4 * 60 * 1000, kind: "sentiment", title: "Humöret är försiktigt positivt", body: "Exempel: nyhetshumör +0,32. Större coins lugna, memecoins mer livliga.", bot: "sentiment" },
    { id: "awhale", ts: NOW - 6 * 60 * 1000, kind: "whale", mint: MINTS.demodog, symbol: "DEMODOG", title: "Valen ligger kvar i DEMODOG", body: "Exempel-val A har inte sålt (låtsas).", bot: "whale", lane: "memecoins" },
    { id: "a5", ts: NOW - 50 * 60 * 1000, kind: "block", mint: MINTS.blocked, symbol: "RUGGX", title: "Stoppade RUGGX", body: "Avvisad: de 10 största ägarna har 48% (exempel).", bot: "analyst", lane: "memecoins" },
    { id: "a6", ts: NOW - 3 * 60 * 60 * 1000, kind: "buy", mint: MINTS.fakepepe, symbol: "FPEPE", title: "KÖP FPEPE · PAPER", body: "Köpt för $20.50 vid $0.000050 (låtsas).", bot: "executor", lane: "memecoins" },
    { id: "asol", ts: NOW - 26 * 60 * 60 * 1000, kind: "buy", mint: MINTS.sol, symbol: "SOL", title: "KÖP SOL · PAPER", body: "Köpt för $80.27 vid $138.40 — spåret för större coins (låtsas).", bot: "executor", lane: "majors" },
    { id: "aport", ts: NOW - 35 * 60 * 1000, kind: "portfolio", title: "Fördelning 43 / 57", body: "Ingen justering behövs. Memecoins 43%, större coins 57% (exempel).", bot: "portfolio" },
    { id: "ares", ts: NOW - 25 * 60 * 1000, kind: "research", title: "Dagens marknadsanteckning", body: "Större coins lugna, memecoins mer livliga. JUP ligger på bevakningslistan (exempel).", bot: "research" },
    { id: "a7", ts: NOW - 5 * 60 * 60 * 1000, kind: "lesson", title: "Lärdom sparad", body: "Lärdom: hoppa över coins från samma skapare som tidigare förlorare (exempel).", bot: "risk", lane: "memecoins" },
    { id: "arev", ts: NOW - 5 * 60 * 60 * 1000, kind: "review", title: "Regelförslag väntar", body: "Reviewer föreslår att sänka memecoin-storleken från 3% till 2,5% efter EXMP-stoppet. Ändras inte förrän du godkänner.", bot: "reviewer", lane: "memecoins" },
    { id: "a8", ts: NOW - 7 * 60 * 60 * 1000, kind: "sell", mint: MINTS.example, symbol: "EXMP", title: "SÅLDE EXMP · PAPER", body: "Såld när priset föll från toppen (trailing stop). −$6.10 (−18%) (låtsas).", pnl_usd: -6.1, bot: "executor", lane: "memecoins" },
    { id: "a9", ts: NOW - 11 * 60 * 60 * 1000, kind: "risk", title: "Marknadsläget är fortfarande GRÖNT", body: "BTC +0,8%, SOL +1,2%. Nya köp är tillåtna (exempel).", bot: "risk" }
  ];

  const coins = {
    [MINTS.demodog]: {
      mint: MINTS.demodog,
      symbol: "DEMODOG",
      name: "Demo Dog (exempel)",
      price_usd: 0.000242,
      change_5m: 1.4,
      change_1h: 6.2,
      change_24h: 15.2,
      mc_usd: 242000,
      liq_usd: 28400,
      volume_24h: 91000,
      holders: 186,
      age_min: 48,
      thesis: "Exempel: Analyst godkände alla åtta säkerhetskontroller. Brain röstade för köp (61 mot 39) eftersom likviditeten (pengarna i poolen) är jämn och pratet kring coinet ser äkta ut. Det här är inte en riktig coin.",
      score: 82,
      decision: "BUY",
      lane: "memecoins",
      chart: demodogPx,
      position: positions[0]
    },
    [MINTS.example]: {
      mint: MINTS.example,
      symbol: "EXMP",
      name: "Example Coin",
      price_usd: 0.00152,
      change_5m: -0.8,
      change_1h: -4.1,
      change_24h: -15.5,
      mc_usd: 152000,
      liq_usd: 12100,
      volume_24h: 44000,
      holders: 94,
      age_min: 210,
      thesis: "Exempel: köptes tidigare med låtsaspengar och såldes på stopp (−18%). Ligger nu på bevakningslistan — det finns mindre pengar i poolen än vi vill se.",
      score: 61,
      decision: "WATCH",
      lane: "memecoins",
      chart: examplePx,
      position: null
    },
    [MINTS.fakepepe]: {
      mint: MINTS.fakepepe,
      symbol: "FPEPE",
      name: "Fake Pepe (exempel)",
      price_usd: 0.000061,
      change_5m: 0.6,
      change_1h: 3.3,
      change_24h: 22.0,
      mc_usd: 61000,
      liq_usd: 16200,
      volume_24h: 38000,
      holders: 142,
      age_min: 320,
      thesis: "Exempel: vi har fortfarande en liten låtsasposition. Resten säljs om priset faller 12% från toppen.",
      score: 74,
      decision: "HOLD",
      lane: "memecoins",
      chart: fakepepePx,
      position: positions[1]
    },
    [MINTS.sol]: {
      mint: MINTS.sol,
      symbol: "SOL",
      name: "Solana (exempel)",
      price_usd: 142.6,
      change_5m: 0.2,
      change_1h: 0.6,
      change_24h: 1.2,
      mc_usd: 78600000000,
      liq_usd: 4200000000,
      volume_24h: 1800000000,
      holders: 1200000,
      age_min: 60 * 24 * 365 * 4,
      thesis: "Exempel: spåret för större coins. Portföljen håller en liten låtsaspost SOL som ankare. Bara förhandsvisningsdata.",
      score: 88,
      decision: "HOLD",
      lane: "majors",
      chart: solPx,
      position: positions[2]
    },
    [MINTS.jup]: {
      mint: MINTS.jup,
      symbol: "JUP",
      name: "Jupiter (exempel)",
      price_usd: 0.412,
      change_5m: -0.3,
      change_1h: 1.1,
      change_24h: 4.8,
      mc_usd: 4100000000,
      liq_usd: 38000000,
      volume_24h: 72000000,
      holders: 89000,
      age_min: 60 * 24 * 400,
      thesis: "Exempel: på bevakningslistan för större coins efter en liten nedgång. Ingen position än.",
      score: 70,
      decision: "WATCH",
      lane: "majors",
      chart: jupPx,
      position: null
    }
  };

  const audits = {
    [MINTS.demodog]: {
      mint: MINTS.demodog,
      symbol: "DEMODOG",
      name: "Demo Dog (exempel)",
      grade: "A",
      notes: "Exempel-säkerhetskoll för förhandsvisningen. Alla steg nedan är påhittade, inte en riktig kontroll.",
      layers: [
        { id: 1, name: "Mint-rätt (skapa fler coins)", pass: true, detail: "Ingen kan skapa fler coins (exempel)." },
        { id: 2, name: "Frys-rätt (låsa coins)", pass: true, detail: "Ingen kan låsa dina coins (exempel)." },
        { id: 3, name: "Låst likviditet", pass: true, detail: "100% av pengarna i poolen är brända, alltså låsta för gott (exempel)." },
        { id: 4, name: "Topp 10-ägare", pass: true, detail: "De 10 största ägarna har 18% (förutom poolen) (exempel)." },
        { id: 5, name: "Insider-plånböcker", pass: true, detail: "Inga kopplade insider-plånböcker (exempel)." },
        { id: 6, name: "Tidiga köpare / buntal", pass: true, detail: "Tidiga köpare äger 4% (exempel)." },
        { id: 7, name: "Prat på sociala medier", pass: true, detail: "22 omnämnanden, inget tecken på koordinerad spam (exempel)." },
        { id: 8, name: "Går det att sälja?", pass: true, detail: "Säljtestet gick igenom, 0% skatt (exempel)." }
      ]
    },
    [MINTS.example]: {
      mint: MINTS.example,
      symbol: "EXMP",
      name: "Example Coin",
      grade: "C",
      notes: "Exempel-säkerhetskoll. De svaga stegen är likviditet (pengar i poolen) och att ägandet är samlat.",
      layers: [
        { id: 1, name: "Mint-rätt (skapa fler coins)", pass: true, detail: "Borttagen (exempel)." },
        { id: 2, name: "Frys-rätt (låsa coins)", pass: true, detail: "Borttagen (exempel)." },
        { id: 3, name: "Låst likviditet", pass: false, status: "warn", detail: "Bara 42% av pengarna i poolen är låsta, och bara i 7 dagar (exempel)." },
        { id: 4, name: "Topp 10-ägare", pass: false, status: "warn", detail: "De 10 största ägarna har 31% (exempel)." },
        { id: 5, name: "Insider-plånböcker", pass: true, detail: "Inga flaggade (exempel)." },
        { id: 6, name: "Tidiga köpare / buntal", pass: true, detail: "7% (exempel)." },
        { id: 7, name: "Prat på sociala medier", pass: true, detail: "Lugnt, 4 omnämnanden (exempel)." },
        { id: 8, name: "Går det att sälja?", pass: true, detail: "Säljtestet gick igenom (exempel)." }
      ]
    },
    [MINTS.fakepepe]: {
      mint: MINTS.fakepepe,
      symbol: "FPEPE",
      name: "Fake Pepe (exempel)",
      grade: "B",
      notes: "Exempel-säkerhetskoll för en låtsasposition som fortfarande är öppen.",
      layers: [
        { id: 1, name: "Mint-rätt (skapa fler coins)", pass: true, detail: "Borttagen (exempel)." },
        { id: 2, name: "Frys-rätt (låsa coins)", pass: true, detail: "Borttagen (exempel)." },
        { id: 3, name: "Låst likviditet", pass: true, detail: "100% bränt, alltså låst för gott (exempel)." },
        { id: 4, name: "Topp 10-ägare", pass: true, detail: "De 10 största ägarna har 22% (exempel)." },
        { id: 5, name: "Insider-plånböcker", pass: true, detail: "Inga flaggade (exempel)." },
        { id: 6, name: "Tidiga köpare / buntal", pass: false, status: "warn", detail: "Tidiga köpare äger 14% — tillåtet, men med mindre belopp (exempel)." },
        { id: 7, name: "Prat på sociala medier", pass: true, detail: "11 omnämnanden (exempel)." },
        { id: 8, name: "Går det att sälja?", pass: true, detail: "Säljtestet gick igenom (exempel)." }
      ]
    },
    [MINTS.blocked]: {
      mint: MINTS.blocked,
      symbol: "RUGGX",
      name: "Blockerad exempel-rug",
      grade: "F",
      notes: "Exempel: den här coinen stoppades av Analyst. Säkerhetskollen underkänd.",
      layers: [
        { id: 1, name: "Mint-rätt (skapa fler coins)", pass: false, detail: "Skaparen kan fortfarande skapa fler coins (exempel)." },
        { id: 2, name: "Frys-rätt (låsa coins)", pass: false, detail: "Skaparen kan fortfarande låsa coins (exempel)." },
        { id: 3, name: "Låst likviditet", pass: false, detail: "Pengarna i poolen är inte låsta (exempel)." },
        { id: 4, name: "Topp 10-ägare", pass: false, detail: "De 10 största ägarna har 48% (exempel)." },
        { id: 5, name: "Insider-plånböcker", pass: false, detail: "3 insider-plånböcker delar samma finansiär (exempel)." },
        { id: 6, name: "Tidiga köpare / buntal", pass: false, detail: "39% köptes i en klump (exempel)." },
        { id: 7, name: "Prat på sociala medier", pass: false, detail: "Plötslig våg av omnämnanden, typiskt för koordinerad spam (exempel)." },
        { id: 8, name: "Går det att sälja?", pass: true, detail: "Säljtestet gick igenom, men coinen stoppades ändå (exempel)." }
      ]
    },
    [MINTS.sol]: {
      mint: MINTS.sol,
      symbol: "SOL",
      name: "Solana (exempel)",
      grade: "A",
      notes: "Exempel-koll för större coins. SOL ligger i det spåret. Stegen nedan är bara exempel.",
      layers: [
        { id: 1, name: "Mint-rätt (skapa fler coins)", pass: true, detail: "Känd, etablerad coin (SOL) (exempel)." },
        { id: 2, name: "Frys-rätt (låsa coins)", pass: true, detail: "Ingen frysrisk i det här spåret (exempel)." },
        { id: 3, name: "Låst likviditet", pass: true, detail: "Mycket pengar i poolen, lätt att sälja (exempel)." },
        { id: 4, name: "Topp 10-ägare", pass: true, detail: "Ägs av många (exempel)." },
        { id: 5, name: "Insider-plånböcker", pass: true, detail: "Inte flaggad (exempel)." },
        { id: 6, name: "Tidiga köpare / buntal", pass: true, detail: "Gäller inte större coins (exempel)." },
        { id: 7, name: "Prat på sociala medier", pass: true, detail: "Alltid omtalad (exempel)." },
        { id: 8, name: "Går det att sälja?", pass: true, detail: "Lätt att sälja till ett bra pris (exempel)." }
      ]
    },
    [MINTS.jup]: {
      mint: MINTS.jup,
      symbol: "JUP",
      name: "Jupiter (exempel)",
      grade: "A",
      notes: "Exempel-koll för en coin på bevakningslistan för större coins.",
      layers: [
        { id: 1, name: "Mint-rätt (skapa fler coins)", pass: true, detail: "Känd, etablerad coin (exempel)." },
        { id: 2, name: "Frys-rätt (låsa coins)", pass: true, detail: "Känd (exempel)." },
        { id: 3, name: "Låst likviditet", pass: true, detail: "Mycket pengar i poolen (exempel)." },
        { id: 4, name: "Topp 10-ägare", pass: true, detail: "Ser bra ut (exempel)." },
        { id: 5, name: "Insider-plånböcker", pass: true, detail: "Inte flaggad (exempel)." },
        { id: 6, name: "Tidiga köpare / buntal", pass: true, detail: "Gäller inte här (exempel)." },
        { id: 7, name: "Prat på sociala medier", pass: true, detail: "Aktivt prat (exempel)." },
        { id: 8, name: "Går det att sälja?", pass: true, detail: "Lätt att sälja till ett bra pris (exempel)." }
      ]
    }
  };

  const decisions = {
    scanner: [
      { id: "s1", ts: NOW - 40 * 1000, mint: MINTS.example, symbol: "EXMP", action: "WATCH", reason: "Ny pool med $12k i likviditet (pengar i poolen) — skickad till Analyst.", confidence: 0.55 },
      { id: "s2", ts: NOW - 10 * 60 * 1000, mint: MINTS.blocked, symbol: "RUGGX", action: "PASS", reason: "Förfilter: namn och låg likviditet. Skickad ändå för en full säkerhetskoll.", confidence: 0.7 },
      { id: "s3", ts: NOW - 16 * 60 * 1000, mint: MINTS.demodog, symbol: "DEMODOG", action: "WATCH", reason: "Klarade scanners första kontroller (likviditet, ålder, namn).", confidence: 0.8 }
    ],
    analyst: [
      { id: "n1", ts: NOW - 2 * 60 * 1000, mint: MINTS.demodog, symbol: "DEMODOG", action: "BUY", reason: "Betyg A — alla åtta säkerhetskontroller godkända.", confidence: 0.86 },
      { id: "n2", ts: NOW - 50 * 60 * 1000, mint: MINTS.blocked, symbol: "RUGGX", action: "BLOCK", reason: "Avvisad: de 10 största ägarna har 48%, och skaparen kan fortfarande skapa fler coins.", confidence: 0.95 },
      { id: "n3", ts: NOW - 4 * 60 * 60 * 1000, mint: MINTS.fakepepe, symbol: "FPEPE", action: "BUY", reason: "Betyg B — lite för många tidiga köpare, så storleken sänktes.", confidence: 0.7 }
    ],
    brain: [
      { id: "b1", ts: NOW - 8 * 60 * 1000, mint: MINTS.demodog, symbol: "DEMODOG", action: "BUY", reason: "Exempelröst 61 mot 39 för köp. Storlek 3% av kassan ($32).", confidence: 0.61 },
      { id: "b2", ts: NOW - 7 * 60 * 60 * 1000, mint: MINTS.example, symbol: "EXMP", action: "SELL", reason: "Priset föll från toppen (trailing stop). Låtsasförlusten bokförd och en lärdom sparad.", confidence: 0.8 }
    ],
    executor: [
      { id: "e1", ts: NOW - 12 * 60 * 1000, mint: MINTS.demodog, symbol: "DEMODOG", action: "BUY", reason: "Köpt för $32.00 vid $0.000210 (låtsas, PAPER).", confidence: 1 },
      { id: "e2", ts: NOW - 3 * 60 * 60 * 1000, mint: MINTS.fakepepe, symbol: "FPEPE", action: "BUY", reason: "Köpt för $20.50 vid $0.000050 (låtsas, PAPER).", confidence: 1 },
      { id: "e3", ts: NOW - 7 * 60 * 60 * 1000, mint: MINTS.example, symbol: "EXMP", action: "SELL", reason: "Såld −$6.10 när priset föll från toppen (låtsas, PAPER).", confidence: 1 }
    ],
    risk: [
      { id: "r1", ts: NOW - 90 * 1000, action: "HOLD", reason: "Marknadsläge GRÖNT. BTC +0,8%, SOL +1,2%. Nya köp är tillåtna.", confidence: 0.9 },
      { id: "r2", ts: NOW - 12 * 60 * 1000, mint: MINTS.demodog, symbol: "DEMODOG", action: "HOLD", reason: "Stopp −25%, och efter toppen säljs resten om priset faller 12% från högsta.", confidence: 0.9 },
      { id: "r3", ts: NOW - 5 * 60 * 60 * 1000, action: "WATCH", reason: "Lärdom sparad: hoppa över coins från samma skapare som tidigare förlorare.", confidence: 0.75 }
    ],
    research: [
      { id: "rs1", ts: NOW - 25 * 60 * 1000, action: "NOTE", reason: "Dagens anteckning: större coins lugna, memecoins mer livliga. JUP på bevakningslistan.", confidence: 0.7 },
      { id: "rs2", ts: NOW - 26 * 60 * 60 * 1000, mint: MINTS.sol, symbol: "SOL", action: "WATCH", reason: "SOL är fortfarande ankaret i spåret för större coins.", confidence: 0.8 }
    ],
    whale: [
      { id: "w1", ts: NOW - 6 * 60 * 1000, mint: MINTS.demodog, symbol: "DEMODOG", action: "HOLD", reason: "Exempel-val A håller fortfarande DEMODOG. Ingen säljsignal att följa.", confidence: 0.66 },
      { id: "w2", ts: NOW - 9 * 60 * 60 * 1000, mint: MINTS.jup, symbol: "JUP", action: "WATCH", reason: "Exempel-val B köpte en liten post JUP (låtsas).", confidence: 0.6 }
    ],
    sentiment: [
      { id: "se1", ts: NOW - 4 * 60 * 1000, action: "WATCH", reason: "Nyhetshumör +0,32, försiktigt positivt. Memecoins mer livliga än större coins.", confidence: 0.58 },
      { id: "se2", ts: NOW - 7 * 60 * 60 * 1000, mint: MINTS.example, symbol: "EXMP", action: "SELL", reason: "Pratet om EXMP tystnade innan stoppet utlöstes.", confidence: 0.62 }
    ],
    rug_guard: [
      { id: "g1", ts: NOW - 70 * 1000, action: "HOLD", reason: "Bevakar DEMODOG, FPEPE och SOL. Inga tecken på bedrägeri. Nödsälj är av (exempel).", confidence: 0.9 },
      { id: "g2", ts: NOW - 50 * 60 * 1000, mint: MINTS.blocked, symbol: "RUGGX", action: "OVERRIDE", reason: "Hade tvingat fram en sälj om vi ägt den här coinen. Går före alla andra botar.", confidence: 0.99 }
    ],
    portfolio: [
      { id: "p1", ts: NOW - 35 * 60 * 1000, action: "HOLD", reason: "Fördelning 43% memecoins / 57% större coins. Inom gränserna — ingen justering (exempel).", confidence: 0.8 },
      { id: "p2", ts: NOW - 26 * 60 * 60 * 1000, mint: MINTS.sol, symbol: "SOL", action: "BUY", reason: "Fyllde på spåret för större coins med låtsas-SOL, så det inte står tomt.", confidence: 0.75 }
    ],
    reviewer: [
      { id: "v1", ts: NOW - 5 * 60 * 60 * 1000, mint: MINTS.example, symbol: "EXMP", action: "PROPOSE", reason: "Efter EXMP-stoppet: förslag att sänka memecoin-storleken från 3% till 2,5%. Väntar på att du godkänner i appen.", confidence: 0.7 },
      { id: "v2", ts: NOW - 29 * 60 * 60 * 1000, action: "NOTE", reason: "Gårdagens genomgång: 1 vinst, 1 förlust. Inget regelförslag.", confidence: 0.65 }
    ]
  };

  const state = {
    mock: true,
    mode: "PAPER",
    running: true,
    schedule: "24/7",
    equity_usd: 1087.84,
    cash_usd: 942.12,
    positions_value_usd: 145.72,
    pnl_today_usd: 11.18,
    pnl_today_pct: 1.04,
    pnl_total_usd: 87.84,
    pnl_total_pct: 8.78,
    market: {
      regime: "RISK_ON",
      btc: { price: 91240, change_24h_pct: 0.8 },
      sol: { price: 142.6, change_24h_pct: 1.2 },
      news: "Större coins lugna, marknadsläget är grönt (exempel)."
    },
    bots,
    positions,
    watching,
    copy_picks: copyPicks,
    lanes: {
      memecoins: { id: "memecoins", label: "Memecoins", pct: 43, usd: 61.89 },
      majors: { id: "majors", label: "Större coins", pct: 57, usd: 82.71 }
    },
    last_action: { text: "Köpte DEMODOG för $32.00 (låtsas, PAPER)", ts: NOW - 12 * 60 * 1000 },
    wallet: { address: WALLET, sol: 3.25, usd: 463.45, label: "Phantom-plånbok (botens, exempel)" },
    screen: { url: "img/screen-mock.png", updated_at: NOW - 20 * 1000 },
    updated_at: NOW
  };

  const charts = {
    today: equityToday,
    "7d": equity7d,
    "30d": equity30d
  };

  const botMeta = {
    scanner: { description: "Hittar nya coins och sållar bort de svaga." },
    analyst: { description: "Kollar 8 säkerhetspunkter på coinet innan ett ev. köp." },
    brain: { description: "Bestämmer hur stort ett köp ska vara, med hjälp av tidigare lärdomar." },
    executor: { description: "Genomför köp och sälj med låtsaspengar (PAPER) — inga riktiga pengar rörs." },
    risk: { description: "Sätter marknadsläget och ser till att stopp-reglerna följs." },
    research: { description: "Skriver dagens marknadsanteckning: teman, nyheter och vad som trendar." },
    whale: { description: "Följer stora plånböcker som botarna bevakar." },
    sentiment: { description: "Läser av humöret i nyheter och på sociala medier." },
    rug_guard: { description: "Bevakar coins vi äger mot bedrägeri. Kan tvinga fram en nödsälj som går före alla andra botar." },
    portfolio: { description: "Fördelar pengarna mellan memecoins och större coins, och justerar vid behov." },
    reviewer: { description: "Går igenom dagen och föreslår regeländringar som du godkänner i appen." }
  };


  const fun = {
    mode: "PAPER",
    period: "vecka",
    leaderboard: [
      { bot: "executor", label: "Executor", emoji: "🤝", pnl_usd: 42.30, pnl_pct: 4.2, trades: 6, win_rate: 67, medal: "🥇" },
      { bot: "risk", label: "Risk", emoji: "🛡️", pnl_usd: 18.10, pnl_pct: 1.8, trades: 4, win_rate: 50, medal: "🥈" },
      { bot: "brain", label: "Brain", emoji: "🧠", pnl_usd: 9.40, pnl_pct: 0.9, trades: 3, win_rate: 67, medal: "🥉" },
      { bot: "majors", label: "Större coins", emoji: "🏦", pnl_usd: 6.20, pnl_pct: 0.6, trades: 2, win_rate: 100, medal: "" }
    ],
    streak: { current: 3, best: 5 },
    week: {
      best: { symbol: "DEMODOG", mint: MINTS.demodog, pnl_usd: 24.50, lane: "memecoin", pnl_pct: 76.6, reason: "Målet nåddes, hälften såld (exempel)" },
      worst: { symbol: "EXMP", mint: MINTS.example, pnl_usd: -6.10, lane: "memecoin", pnl_pct: -18.0, reason: "Stopp när priset föll från toppen (exempel)" }
    },
    meme: { date: "2026-11-25", text: "SOL trendar idag 🔥 · Botarna: 'Vi kollar säkerheten först' 🧪", trending: [], theme: "christmas" },
    chat: [
      { id: 1, ts: NOW - 12 * 60 * 1000, bot: "executor", label: "Executor", emoji: "🤝", text: "Klart! Jag köpte DEMODOG för $32.00 🛒", mint: MINTS.demodog },
      { id: 2, ts: NOW - 8 * 60 * 1000, bot: "analyst", label: "Analyst", emoji: "🧪", text: "DEMODOG klarade alla 8 säkerhetskontroller. Betyg A." , mint: MINTS.demodog },
      { id: 3, ts: NOW - 2 * 60 * 1000, bot: "risk", label: "Risk", emoji: "🛡️", text: "Jag vaktar 3 öppna affärer. Stoppen sitter kvar." }
    ],
    mood: { score: 50, emoji: "😐", label: "Neutral", explain: "Varken glad eller rädd – vanligt läge. (exempeldata)", fear_greed: 50, regime: "GREEN" },
    wins: [{ id: 2, symbol: "DEMODOG", pnl_usd: 24.50, ts: NOW - 26 * 60 * 60 * 1000 }],
    badges: [
      { id: "first_trade", name: "Första affären", desc: "Första stängda affären", emoji: "🎯", unlocked: true },
      { id: "first_win", name: "Första vinsten", desc: "Första affären med plus", emoji: "🍀", unlocked: true },
      { id: "x2", name: "Dubblat", desc: "En coin som gick till 2×", emoji: "2️⃣", unlocked: false }
    ]
  };
  const ticker = { items: [
    { symbol: "BTC", price: 91240, change_24h: 0.8, held: false },
    { symbol: "ETH", price: 3120, change_24h: 0.4, held: false },
    { symbol: "SOL", price: 142.6, change_24h: 1.2, held: true },
    { symbol: "JUP", price: 0.412, change_24h: 4.8, held: false },
    { symbol: "DEMODOG", price: 0.000242, change_24h: 15.2, held: true }
  ]};

  global.DESK_MOCK = {
    WALLET,
    MINTS,
    state,
    charts,
    activity,
    coins,
    audits,
    decisions,
    botMeta,
    fun,
    ticker
  };
})(window);
