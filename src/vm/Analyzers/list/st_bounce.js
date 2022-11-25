/*
Bounce of Levels My Own Strategy

*** Условия начала поиска

1. Супертренд ВНИЗ (или вся свеча ниже emac21)

2. Свеча у которой нижний хвост больше тела, а верхний меньше (или ham)
нижним хвостом оказывается в уровнях, но закрывается вне уровней

3. До высоты цены +1.27% нет других уровней.

> Начинаем поиск
> Запоминаем самую нижнюю границу среди всех уровней, которые мы касаемся хвостом.
> Запоминаем самую верхнюю границу среди всех уровней, которые мы касаемся хвостом.
(ну и суммарный вес на всякий случай - по нему фильтровать потом заказы)

*** Условия конца поиска:

	1. Есть свеча, которая закрывается ниже нижней границы
	2. Проходит более 20 свечей без заверщения всех последующих событий.

*** Продолжаем поиск

Ожидаем:
4. хотя бы 3 свечи, которые полностью над верхней границей уровня. (отскок?)
5. extremum.high
6. Вторая свеча с хвостом внутри, с закрытием снаружи (критерии первой)
7. Значение  emac21 меньше, чем emac21  во время первой свечи (поджатие к уровню)

*** Точка входа:

А. Предыдущая свеча красная, текущая свеча зеленая

или

Б. Зеленая свеча CLOSE-ABOVE, ENGULFING UP, HAMMER с объемом в два раза больше предыдущей свечи

*/

const Strategy = require('../types/Strategy');

function isCurrentCandleBouncy(isLong, candle, io) {
  if (isLong) {
    if (io.get('cdlpatts.new.ham') === candle) return true;
  } else if (io.get('cdlpatts.new.shu') === candle) return true;
}

class Finder {
  constructor(io, id, { isLong, levelY0, levelY1, levelWeight, ma }) {
    this.io = io;

    this.id = id;
    this.isLong = isLong;
    this.levelY0 = levelY0;
    this.levelY1 = levelY1;
    this.levelWeight = levelWeight;
    this.firstCandleMA = ma;

    this.length = 0;
    this.countCandlesAboveLevel = 0;
    this.bounceExtremumCandle = null;
    this.allCriteriaMet = false;
  }

  addCandle(candle) {
    this.currentCandle = candle;

    if (++this.length > BOUNCE.MAX_SEARCH_LENGTH) return null;
    if (this.candleClosesBelowLevel(candle)) return null;

    if (this.candleFullyAboveLevel(candle)) this.countCandlesAboveLevel++;

    const newBounceExtremum = this.getBounceExtremum();
    if (newBounceExtremum) this.bounceExtremumCandle = newBounceExtremum;

    if (!this.allCriteriaMet) {
      this.allCriteriaMet =
        this.countCandlesAboveLevel > BOUNCE.MIN_CANDLES_ABOVE_LEVEL &&
        this.bounceExtremumCandle !== null &&
        this.isCandleBouncesOfLevel(candle) &&
        this.isApproachingToLevel();
    }

    if (this.allCriteriaMet) {
      // searching just entry point
      if (this.isEntryTriggered(candle)) {
        const isLong = this.isLong;
        const stopLoss = isLong ? this.levelY0 : this.levelY1;

        return { entry: { isLong, stopLoss } };
      }
    }

    return {};
  }

  isEntryTriggered(candle) {
    return this.isLong ? candle.isGreen() : candle.isRed();
  }

  candleClosesBelowLevel(candle) {
    return this.isLong
      ? candle.bodyLow() < this.levelY0
      : candle.bodyHigh() > this.levelY1;
  }

  candleFullyAboveLevel(candle) {
    return this.isLong ? candle.low > this.levelY1 : candle.high < this.levelY0;
  }

  getBounceExtremum() {
    const extrem = this.io.get('extremum');
    if (!extrem) return null;

    if (this.isLong) {
      return extrem.high ? extrem.candle : null;
    }

    return extrem.low ? extrem.candle : null;
  }

  isApproachingToLevel() {
    const ma = this.io.get(BOUNCE.TREND_MA);
    return this.isLong ? ma < this.firstCandleMA : ma > this.firstCandleMA;
  }

  isCandleBouncesOfLevel(candle) {
    if (!isCurrentCandleBouncy(this.isLong, candle, this.io)) return false;
    if (!this.priceInLevel(this.isLong ? candle.low : candle.high))
      return false;
    if (!this.priceAboveLevel(candle.close)) return false;

    return true;
  }

  priceAboveLevel(price) {
    return this.isLong ? price > this.levelY1 : price < this.levelY0;
  }

  priceInLevel(price) {
    return price >= this.levelY0 && price <= this.levelY1;
  }
}

class BOUNCE extends Strategy {
  static SKY_CLEAN_PERCENT = 0.0127;
  static TREND_MA = 'emac21';
  static RR_RATIO = 1.5;
  static BOUNCE_TAIL_MIN_LEVEL = 1;
  static BOUNCE_CLOSE_MAX_LEVEL = 0;
  static MAX_SEARCH_LENGTH = 25;
  static MIN_CANDLES_ABOVE_LEVEL = 3;

  constructor() {
    super();
    this.finder = null;
  }

  init(io) {
    io.require('vlevels');
    io.require(BOUNCE.TREND_MA);
    io.require('cdlpatts');
    io.require('extremum');
  }

  getId() {
    return this.name;
  }

  addCandle(candle, io) {
    super.addCandle(candle, io);

    if (this.finder !== null) {
      const res = this.finder.addCandle(candle);
      if (res === null) {
        this.finder = null;
      } else if (res.entry) {
        // found entry
        io.makeEntry(this, res.entry.isLong ? 'buy' : 'sell', {
          rrRatio: BOUNCE.RR_RATIO,
          stopLoss: res.entry.stopLoss,
        });
      }
    }

    // end for one find could be start of another search

    const newSearchParams = this.getStartNewSearchParams(candle, io);
    if (newSearchParams) {
      this.finder = new Finder(io, 0, newSearchParams);
    }
  }

  getLevelsArray(io) {
    const vlevels = io.get('vlevels');
    const vlevels_high = io.get('vlevels_high');
    let levelsArray = vlevels.getLevels();
    if (vlevels_high)
      levelsArray = [...levelsArray, ...vlevels_high.getLevels()];
    return levelsArray;
  }

  isCandleBouncesOfLevel(isLong, levelsArray, candle, io) {
    const infoFn = io.get('vlevels').getInfoAtPrice();
    const closeInfo = infoFn(levelsArray, candle.close);
    if (
      closeInfo.resistWeight + closeInfo.supportWeight >
      BOUNCE.BOUNCE_CLOSE_MAX_LEVEL
    )
      return false;

    const tailInfo = infoFn(levelsArray, isLong ? candle.low : candle.high);
    const tailTotalSupportWeight =
      tailInfo.resistWeight + tailInfo.supportWeight;
    if (tailTotalSupportWeight < BOUNCE.BOUNCE_TAIL_MIN_LEVEL) return false;

    return tailInfo;
  }

  isClearTakeProfit(isLong, levelsArray, candle, io) {
    const skyHeight = candle.close * BOUNCE.SKY_CLEAN_PERCENT;

    const skyY0 = isLong ? candle.close : candle.close - skyHeight;
    const skyY1 = isLong ? candle.close + skyHeight : candle.close;

    const { supportWeight, resistWeight } = io
      .get('vlevels')
      .getInfoAtRange(levelsArray, skyY0, skyY1);

    return supportWeight + resistWeight <= 0;
  }

  getStartNewSearchParams(candle, io) {
    if (this.finder !== null) {
      return null;
    }

    const ma = io.get(BOUNCE.TREND_MA);
    let isLong = null;

    if (candle.high < ma) {
      isLong = true;
    } else if (candle.low > ma) {
      isLong = false;
    }

    if (isLong === null) return null;

    if (!isCurrentCandleBouncy(isLong, candle, io)) return null;

    const levels = this.getLevelsArray();

    const tailLevelsContactInfo = this.isCandleBouncesOfLevel(
      isLong,
      levels,
      candle,
      io
    );
    if (!tailLevelsContactInfo) return null;

    if (!this.isClearTakeProfit(isLong, levels, candle, io)) return null;

    const levelWeight =
      tailLevelsContactInfo.resistWeight + tailLevelsContactInfo.supportWeight;

    const levelY0 = tailLevelsContactInfo.levels.reduce(
      (s, c) => (c < s ? c : s),
      candle.close
    );

    const levelY1 = tailLevelsContactInfo.levels.reduce(
      (s, c) => (c > s ? c : s),
      0
    );

    return { isLong, levelY0, levelY1, levelWeight, ma };
  }
}

module.exports = BOUNCE;
