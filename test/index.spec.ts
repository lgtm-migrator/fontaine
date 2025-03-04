import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname } from 'pathe'
import handler from 'serve-handler'
import { describe, it, expect } from 'vitest'
import { getRandomPort } from 'get-port-please'
import {
  generateFontFace,
  parseFontFace,
  generateOverrideName,
} from '../src/css'
import { getMetricsForFamily, readMetrics } from '../src/metrics'

const fixtureURL = new URL('../playground/fonts/font.ttf', import.meta.url)

describe('generateFontFace', () => {
  it('generates CSS font face override ', async () => {
    const metrics = await readMetrics(fixtureURL)
    // @ts-expect-error if metrics is not defined the test should throw
    const result = generateFontFace(metrics, {
      name: 'example override',
      fallbacks: ['fallback'],
      'font-weight': 'bold',
    })
    expect(result).toMatchInlineSnapshot(`
      "@font-face {
        font-family: \\"example override\\";
        src: local(\\"fallback\\");
        ascent-override: 105%;
        descent-override: 35%;
        line-gap-override: 10%;
        font-weight: bold;
      }
      "
    `)
  })
})

describe('generateOverrideName', () => {
  it('works', () => {
    expect(generateOverrideName('some thing')).toBe('some thing override')
  })
})

describe('getMetricsForFamily', () => {
  it('reads font metrics based on font family', async () => {
    const metrics = await getMetricsForFamily('Merriweather Sans')
    expect(metrics).toMatchInlineSnapshot(`
      {
        "ascent": 1968,
        "capHeight": 1486,
        "descent": -546,
        "familyName": "Merriweather Sans",
        "lineGap": 0,
        "unitsPerEm": 2000,
        "xHeight": 1114,
      }
    `)
    // Test cache
    expect(await getMetricsForFamily('Merriweather Sans')).toEqual(metrics)

    expect(
      // eslint-disable-next-line
      generateFontFace(metrics!, {
        name: 'Merriweather Sans override',
        fallbacks: ['Arial'],
      })
    ).toMatchInlineSnapshot(`
      "@font-face {
        font-family: \\"Merriweather Sans override\\";
        src: local(\\"Arial\\");
        ascent-override: 98.4%;
        descent-override: 27.3%;
        line-gap-override: 0%;
      }
      "
    `)
  })

  it('handles non-existent metrics', async () => {
    const metrics = await getMetricsForFamily('Bingo Bob the Font')
    expect(metrics).toBeNull()
  })

  it('handles empty input', async () => {
    const metrics = await getMetricsForFamily('Bingo Bob the Font')
    expect(metrics).toBeNull()
  })
})

describe('readMetrics', () => {
  it('reads font metrics from a file', async () => {
    const metrics = await readMetrics(
      new URL('../playground/fonts/font.ttf', import.meta.url)
    )
    expect(metrics).toMatchInlineSnapshot(`
      {
        "ascent": 1050,
        "capHeight": 698,
        "descent": -350,
        "familyName": "Poppins",
        "fullName": "Poppins Regular",
        "lineGap": 100,
        "postscriptName": "Poppins-Regular",
        "subfamilyName": "Regular",
        "unitsPerEm": 1000,
        "xHeight": 548,
      }
    `)
  })
  it('reads metrics from a URL', async () => {
    const server = createServer((request, response) =>
      handler(request, response, {
        public: dirname(fileURLToPath(fixtureURL)),
      })
    )
    const port = await getRandomPort()
    server.listen(port)
    const metrics = await readMetrics(`http://localhost:${port}/font.ttf`)
    expect(metrics).toMatchInlineSnapshot(`
      {
        "ascent": 1050,
        "capHeight": 698,
        "descent": -350,
        "familyName": "Poppins",
        "fullName": "Poppins Regular",
        "lineGap": 100,
        "postscriptName": "Poppins-Regular",
        "subfamilyName": "Regular",
        "unitsPerEm": 1000,
        "xHeight": 548,
      }
    `)
    server.close()
  })
  it('ignores non-URL paths', async () => {
    const metrics = await readMetrics(`/font.ttf`)
    expect(metrics).toBeNull()
  })
})

describe('parseFontFace', () => {
  it('should extract source, weight and font-family', () => {
    const result = parseFontFace(
      `@font-face {
        font-family: Roboto, "Arial Neue", sans-serif;
        src: url("/fonts/OpenSans-Regular-webfont.woff2") format("woff2"),
             url("/fonts/OpenSans-Regular-webfont.woff") format("woff");
        unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;
      }`
    ).next().value
    expect(result).toMatchInlineSnapshot(`
      {
        "family": "Roboto",
        "source": "/fonts/OpenSans-Regular-webfont.woff2",
      }
    `)
  })
  it('should handle incomplete font-faces', () => {
    for (const result of parseFontFace(
      `@font-face {
      }`
    )) {
      expect(result).toMatchInlineSnapshot(`
      {
        "family": "",
        "source": "",
      }
    `)
    }
  })
  it('should handle sources without urls', () => {
    for (const result of parseFontFace(
      `@font-face {
        src: local("Arial") url();
      }`
    )) {
      expect(result).toMatchInlineSnapshot(`
      {
        "family": "",
        "source": "",
      }
      `)
    }
  })
})
