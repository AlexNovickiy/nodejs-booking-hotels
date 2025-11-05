const parseQuery = (q) => {
  return typeof q === 'string' ? q : undefined;
};

const parseGuests = (guests) => {
  const num = parseInt(guests);
  return !Number.isNaN(num) && num > 0 ? num : undefined;
};

export const parseFilterParams = (query) => {
  const { q, guests } = query;

  const parsedQuery = parseQuery(q);
  const parsedGuests = parseGuests(guests);

  return {
    ...(parsedQuery !== undefined && { q: parsedQuery }),
    ...(parsedGuests !== undefined && { guests: parsedGuests }),
  };
};
