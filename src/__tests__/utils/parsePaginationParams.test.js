import { describe, it, expect } from 'vitest';
import { parsePaginationParams } from '../../utils/parsePaginationParams.js';

describe('parsePaginationParams', () => {
  it('повертає дефолтні значення для порожнього query', () => {
    expect(parsePaginationParams({})).toEqual({ page: 1, perPage: 10 });
  });

  it('парсить коректні рядкові числа', () => {
    expect(parsePaginationParams({ page: '3', perPage: '20' })).toEqual({
      page: 3,
      perPage: 20,
    });
  });

  it('повертає дефолт якщо page не рядок', () => {
    expect(parsePaginationParams({ page: 5 })).toEqual({ page: 1, perPage: 10 });
  });

  it('повертає дефолт якщо значення не є числом', () => {
    expect(parsePaginationParams({ page: 'abc', perPage: 'xyz' })).toEqual({
      page: 1,
      perPage: 10,
    });
  });

  it('парсить тільки page якщо perPage відсутній', () => {
    expect(parsePaginationParams({ page: '2' })).toEqual({
      page: 2,
      perPage: 10,
    });
  });
});
