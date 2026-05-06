import { describe, it, expect } from 'vitest';
import { parseSortParams } from '../../utils/parseSortParams.js';

describe('parseSortParams', () => {
  it('повертає дефолтні значення для порожнього query', () => {
    expect(parseSortParams({})).toEqual({ sortOrder: 'asc', sortBy: '_id' });
  });

  it('повертає коректний sortOrder asc', () => {
    expect(parseSortParams({ sortOrder: 'asc' }).sortOrder).toBe('asc');
  });

  it('повертає коректний sortOrder desc', () => {
    expect(parseSortParams({ sortOrder: 'desc' }).sortOrder).toBe('desc');
  });

  it('повертає дефолт asc для невідомого sortOrder', () => {
    expect(parseSortParams({ sortOrder: 'invalid' }).sortOrder).toBe('asc');
  });

  it('повертає відомий sortBy', () => {
    expect(parseSortParams({ sortBy: 'price' }).sortBy).toBe('price');
    expect(parseSortParams({ sortBy: 'title' }).sortBy).toBe('title');
    expect(parseSortParams({ sortBy: 'ratings_summary.average_rating' }).sortBy).toBe(
      'ratings_summary.average_rating',
    );
  });

  it('повертає _id для невідомого sortBy', () => {
    expect(parseSortParams({ sortBy: 'unknownField' }).sortBy).toBe('_id');
  });

  it('парсить sortOrder і sortBy разом', () => {
    expect(parseSortParams({ sortOrder: 'desc', sortBy: 'price' })).toEqual({
      sortOrder: 'desc',
      sortBy: 'price',
    });
  });
});
