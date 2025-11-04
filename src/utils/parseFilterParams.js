const parseContactType = (contactType) => {
  const isString = typeof contactType === 'string';
  if (!isString) return;
  const isContactType = (type) => ['work', 'home', 'personal'].includes(type);

  if (isContactType(contactType)) return contactType;
};

const parseBoolean = (value) => {
  if (value === 'true') return true;
  else if (value === 'false') return false;
  else return undefined;
};

export const parseFilterParams = (query) => {
  const { contactType, isFavourite } = query;

  const parsedContactType = parseContactType(contactType);
  const parsedIsFavourite = parseBoolean(isFavourite);

  return {
    ...(parsedContactType !== undefined && { contactType: parsedContactType }),
    ...(parsedIsFavourite !== undefined && { isFavourite: parsedIsFavourite }),
  };
};
