function isPatternAndBounce(flags, { isLong, levelY0, levelY1 }) {
  const patternCandle = getBouncyCandle(isLong, flags);
  if (!patternCandle) return null;

  if (!isCandleBouncesOfLevel(patternCandle, { isLong, levelY0, levelY1 }))
    return null;

  return patternCandle;
}

function isCandleBouncesOfLevel(candle, { isLong, levelY0, levelY1 }) {
  const { y0, y1 } = getCandleTouchRange(candle, isLong);
  if (y0 > levelY1 || y1 < levelY0) return false;
  return true;
}

function isCandleFullyAboveLevel(candle, { isLong, levelY0, levelY1 }) {
  return isLong ? candle.low > levelY1 : candle.high < levelY0;
}

function isCandleClosesBelowLevel(candle, { isLong, levelY0, levelY1 }) {
  return isLong ? candle.bodyLow() < levelY0 : candle.bodyHigh() > levelY1;
}

function getCandleTouchRange(candle, isLong) {
  return isLong
    ? { y0: candle.low, y1: candle.bodyLow() }
    : { y1: candle.high, y0: candle.bodyHigh() };
}

function getBouncyCandle(isLong, flags) {
  if (isLong) {
    const ham = flags.get('cdlpatts.new.ham');
    const egu = flags.get('cdlpatts.new.egu');
    const rtu = flags.get('cdlpatts.new.rtu');
    return ham || egu || rtu || null;
  }
  const shu = flags.get('cdlpatts.new.shu');
  const egd = flags.get('cdlpatts.new.egd');
  const rtd = flags.get('cdlpatts.new.rtd');
  return shu || egd || rtd || null;
}

function isPriceAboveLevel(price, { isLong, levelY0, levelY1 }) {
  return isLong ? price > levelY1 : price < levelY0;
}

function isPriceInLevel(price, { levelY0, levelY1 }) {
  return price >= levelY0 && price <= levelY1;
}

function getLevelsArrayFromFlags(flags) {
  const vlevels = flags.get('vlevels');
  const vlevels_high = flags.get('vlevels_high');
  let levelsArray = vlevels.getLevels();
  //if (vlevels_high) levelsArray = [...levelsArray, ...vlevels_high.getLevels()];

  if (vlevels_high) levelsArray = vlevels_high.getLevels();

  return levelsArray;
}

function getLevelsYRange(levelsArray) {
  const levelY0 = levelsArray.reduce(
    (minY, level) => (level.resY0 < minY ? level.resY0 : minY),
    Number.MAX_VALUE
  );

  const levelY1 = levelsArray.reduce(
    (maxY, level) => (level.resY1 > maxY ? level.resY1 : maxY),
    0
  );

  return { levelY0, levelY1 };
}

function getLevelsTouchInfo(isLong, candle, levelsArray) {
  const info = getLevelsInfoAtRange(
    levelsArray,
    getCandleTouchRange(candle, isLong)
  );

  if (!info || info.levels.length === 0) {
    return null;
  }

  const totalWeight = info.resistWeight + info.supportWeight;

  return { ...info, totalWeight };
}

function getLevelsInfo(levelsArray) {
  return levelsArray.reduce(
    (sum, level) => {
      return {
        resistWeight: sum.resistWeight + level.resistWeight,
        supportWeight: sum.supportWeight + level.supportWeight,
        levelIds: [...sum.levelIds, level.getId()],
        levels: [...sum.levels, level],
      };
    },
    { resistWeight: 0, supportWeight: 0, levelIds: [], levels: [] }
  );
}

function getLevelsInfoAtPrice(levelsArray, price) {
  return getLevelsInfo(levelsArray.filter((lvl) => lvl.isPriceInLevel(price)));
}

function getLevelsInfoAtRange(levelsArray, { y0, y1 }) {
  return getLevelsInfo(
    levelsArray.filter((lvl) => lvl.isRangeIntersectsLevel(y0, y1))
  );
}

module.exports = Object.freeze({
  isPatternAndBounce,
  isCandleBouncesOfLevel,
  isCandleFullyAboveLevel,
  isCandleClosesBelowLevel,
  getCandleTouchRange,
  getBouncyCandle,
  isPriceAboveLevel,
  isPriceInLevel,
  getLevelsArrayFromFlags,
  getLevelsYRange,
  getLevelsTouchInfo,
  getLevelsInfo,
  getLevelsInfoAtPrice,
  getLevelsInfoAtRange,
});
