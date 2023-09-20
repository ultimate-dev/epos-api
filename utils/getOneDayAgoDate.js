const getOneDayAgoDate = (date, day = 0) => {
  let newDate = new Date(date);

  newDate.setDate(newDate.getDate() - day);
  newDate.setHours(21, 0, 0, 0);

  return new Date(newDate);
};

module.exports = getOneDayAgoDate;
