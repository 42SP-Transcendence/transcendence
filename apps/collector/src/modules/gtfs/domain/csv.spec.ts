import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('reads quoted and unquoted fields', () => {
    expect(parseCsv('stop_id,"stop_name"\n18848,"Clínicas"\n')).toEqual([
      ['stop_id', 'stop_name'],
      ['18848', 'Clínicas'],
    ]);
  });

  it('handles CRLF line endings and a leading BOM', () => {
    expect(parseCsv('﻿"a","b"\r\n"1","2"\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps commas, escaped quotes and line breaks inside quoted fields', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi""\nthere"')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
    ]);
  });

  it('keeps empty fields and skips blank lines', () => {
    expect(parseCsv('a,b,c\n\n1,,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });
});
