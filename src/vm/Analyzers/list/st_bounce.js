/*
Bounce of Levels My Own Strategy

1. Определение отскока - добавить паттернов
 * просто свеча у которой хвост 51% от всего тела отпрыгиывает
 - OUTSIDE REVERSAL pattern - первая красная целиком внутри второй зеленой - вторая зеленая закрывается
 выше открытия красной.
 - три белых/черных солдата и прочая дребедень?

2. Отскоком считать - если свеча отскокная и закрывается выше (ниже) середины уровня, при этом
хвост может торчать за уровень. Точкой отсчета стоплоса считать хвост свечи. А начало "неба" считать
с верхней границы уровня.


TODO: Сделать уровни магниты:

- уровни, которые были пересечены свечой с объемом в 3 раза больше чем предыдущие средние 3
- gap несправедливого равенства в середине трех быстрорастущих свечей

Уровень магнит для ШОРТОВ, если объемная свеча пробила снизу вверх.
Значит ждем баунс от Жёлтого уровня, который находится вышеч

Дополнительный сигналы для разворота:
  - цена значительно выше/ниже закрытия прошлого дня/недели.
  - Суммарный вес не погашенных магнитов > N
  - Есть много локальных уровней с одним касанием (не оттестированные), количество > K


Вообщем как у чувака в ПДФ, только с разворотом от уровня (баунс)


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
const L = require('../helpers/levels.js');

class PARAMS {
  static SKY_HEIGHT_PERCENT = 0.004; //0.0127;
  static SKY_MAX_WEIGHT = 0;

  static TREND_MA = 'emac21';
  static RR_RATIO = 1.5;
  static BOUNCE_TAIL_MIN_LEVEL = 1;
  static BOUNCE_CLOSE_MAX_LEVEL = 0;
  static MAX_SEARCH_LENGTH = 32;
  static MIN_CANDLES_ABOVE_LEVEL = 3;
}

function ltop(candle, label, { isLong, io }) {
  return isLong
    ? io.cdb().labelTop(candle, label)
    : io.cdb().labelBottom(candle, label);
}

function lbot(candle, label, { isLong, io }) {
  return isLong
    ? io.cdb().labelBottom(candle, label)
    : io.cdb().labelTop(candle, label);
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
    //

    if (++this.length > PARAMS.MAX_SEARCH_LENGTH) return null;
    if (L.isCandleClosesBelowLevel(candle, this)) return null;

    if (L.isCandleFullyAboveLevel(candle, this)) this.countCandlesAboveLevel++;

    const newBounceExtremum = this.getBounceExtremum();
    if (newBounceExtremum) this.bounceExtremumCandle = newBounceExtremum;

    if (!this.allCriteriaMet) {
      if (
        this.countCandlesAboveLevel > PARAMS.MIN_CANDLES_ABOVE_LEVEL &&
        this.bounceExtremumCandle !== null
        // && this.isApproachingToLevel();
      ) {
        const patternCandle = L.isPatternAndBounce(this.io.getFlags(), this);
        if (patternCandle !== null) {
          this.allCriteriaMet = true;
          lbot(patternCandle, this.isLong ? '^' : 'v', this);
        }
      }
    }

    if (this.allCriteriaMet) {
      // searching just entry point
      if (this.isEntryTriggered(candle)) {
        const isLong = this.isLong;
        const atr = this.io.get('atr14');

        const stopLoss = isLong
          ? Math.min(this.levelY0, candle.low) - 1.5 * atr
          : Math.max(this.levelY1, candle.high) + 1.5 * atr;
        //const stopLoss = null;

        return { entry: { isLong, stopLoss } };
      }
    }

    return {};
  }

  isEntryTriggered(candle) {
    return this.isLong ? candle.isGreen() : candle.isRed();
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
    const ma = this.io.get(PARAMS.TREND_MA);
    return this.isLong ? ma < this.firstCandleMA : ma > this.firstCandleMA;
  }
}

class BOUNCE extends Strategy {
  constructor() {
    super();
    this.finder = null;
    this.name = 'bounce';

    this.finders = [];
    this.maxId = 0;
  }

  init(io) {
    io.require('vlevels');
    io.require(PARAMS.TREND_MA);
    io.require('cdlpatts');
    io.require('extremum');
    io.require('atr14');
  }

  nextFinderId() {
    this.maxId++;
    if (this.maxId > 99) {
      this.maxId = 1;
    }
    return this.maxId;
  }

  getId() {
    return this.name;
  }

  addCandle(candle, io) {
    super.addCandle(candle, io);
    io.cdb().setSource(this.getId());

    if (this.finder !== null) {
      const res = this.finder.addCandle(candle);
      if (res === null) {
        this.finder = null;
      } else if (res.entry) {
        // found entry
        io.makeEntry(this, res.entry.isLong ? 'buy' : 'sell', {
          rrRatio: PARAMS.RR_RATIO,
          stopLoss: res.entry.stopLoss,
        });
        this.finder = null;
      }
    }

    // end for one find could be start of another search

    if (this.finder !== null) return; // for now we only have one finder;

    const newSearchParams = this.getStartNewSearchParams(candle, io);
    if (newSearchParams) {
      this.finder = new Finder(io, 0, newSearchParams);
      ltop(candle, 'b1', { isLong: newSearchParams.isLong, io });
    }
  }

  getStartNewSearchParams(currentCandle, io) {
    const ma = io.get(PARAMS.TREND_MA);
    let isLong = null;

    if (currentCandle.high < ma) {
      isLong = true;
    } else if (currentCandle.low > ma) {
      isLong = false;
    }

    if (isLong === null) return null;

    const patternCandle = L.getBouncyCandle(isLong, io.getFlags());
    if (!patternCandle) return null;

    const levelsArray = L.getLevelsArrayFromFlags(io.getFlags());
    const levelsTouchInfo = L.getLevelsTouchInfo(
      isLong,
      patternCandle,
      levelsArray
    );

    if (!levelsTouchInfo) return null;

    lbot(patternCandle, isLong ? '^' : 'v', { isLong, io });

    const { totalWeight, levels: touchedLevelsArray } = levelsTouchInfo;

    if (totalWeight < PARAMS.BOUNCE_TAIL_MIN_LEVEL) return null;

    const { levelY0, levelY1 } = L.getLevelsYRange(touchedLevelsArray);

    const skyStartsAt = isLong
      ? Math.max(patternCandle.high, levelY1)
      : Math.min(patternCandle.low, levelY0);

    if (!this.isTakeProfitZoneClear(isLong, levelsArray, skyStartsAt)) {
      ltop(patternCandle, 'xS', { isLong, io });
    }

    return { isLong, levelY0, levelY1, levelWeight: totalWeight, ma };
  }

  isTakeProfitZoneClear(isLong, levelsArray, topPrice) {
    const skyHeight = topPrice * PARAMS.SKY_HEIGHT_PERCENT;

    const skyY0 = isLong ? topPrice : topPrice - skyHeight;
    const skyY1 = isLong ? topPrice + skyHeight : topPrice;

    const { supportWeight, resistWeight } = L.getLevelsInfoAtRange(
      levelsArray,
      {
        y0: skyY0,
        y1: skyY1,
      }
    );

    return supportWeight + resistWeight <= PARAMS.SKY_MAX_WEIGHT;
  }
}

module.exports = BOUNCE;
