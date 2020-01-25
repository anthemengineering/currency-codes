const fs = require('fs');
const xml2js = require('xml2js');

const input = 'iso-4217-list-one.xml';
const output = 'data.js';

function ingestEntry(entry) {
  return {
    code: entry.Ccy && entry.Ccy._,
    number: entry.CcyNbr && entry.CcyNbr._,
    digits: (entry.CcyMnrUnts && parseInt(entry.CcyMnrUnts._)) || 0,
    currency: entry.CcyNm && entry.CcyNm._,
    countries: (entry.CtryNm && [entry.CtryNm._]) || []
  };
}

function indexByCode(index, c) {
  if (!index[c.code]) {
    index[c.code] = c;
  } else {
    index[c.code].countries = index[c.code].countries.concat(c.countries);
  }
  return index;
}

function compareCurrencyCode(a, b) {
  if (a.code < b.code) {
    return -1;
  }

  if (a.code > b.code) {
    return +1;
  }

  return 0;
}

function ingestEntries(data) {
  const currenciesByCode = data.ISO_4217.CcyTbl.CcyNtry
    .map(ingestEntry)
    .reduce(indexByCode, {});

  const currencies = Object.values(currenciesByCode);
  currencies.sort(compareCurrencyCode);

  return currencies;
}

function ingestPublishDate(data) {
  return data.ISO_4217.Pblshd;
}

function failOnError(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
}

fs.readFile(input, function(err, data) {
  failOnError(err);

  xml2js.parseString(
    data,
    {
      explicitArray: false,  // turn off array wrappers around content
      explicitCharkey: true, // put all content under a key so its easier to parse when there are attributes
      mergeAttrs: true       // lift attributes up so they're easier to parse
    },
    function(err, result) {
      failOnError(err);

      const publishDate = ingestPublishDate(result);
      const countries = ingestEntries(result);

      const data = '/*\n' +
        '\tFollows ISO 4217, https://www.iso.org/iso-4217-currency-codes.html\n' +
        '\tSee https://www.currency-iso.org/dam/downloads/lists/list_one.xml\n' +
        '\tData last updated ' + publishDate + '\n' +
        '*/\n\n' +
        'module.exports = ' + JSON.stringify(countries, null, '  ') + ';';

      fs.writeFile(output, data, function(err) {
        failOnError(err);

        console.log('Ingested ' + input + ' into ' + output);
      });
  });
});
