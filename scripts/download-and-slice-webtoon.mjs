import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

async function downloadAndSlice() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    extraHTTPHeaders: { 'Referer': 'https://comic.naver.com/' }
  });

  const baseDir = path.resolve('tests/fixtures/real-manhwa');
  await fs.mkdir(path.join(baseDir, 'chapter-1'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'chapter-2'), { recursive: true });

  const chapters = [
    {
      num: 1,
      dir: 'chapter-1',
      url: 'https://image-comic.pstatic.net/webtoon/183559/1/20200224160710_5612ba93ad32cad7b8f73ea05c76e393_IMAG01_1.jpg',
      // Slices representing natural story panels down the 8280px tall strip:
      slices: [
        { id: 'ch1_panel_01', y0: 300, h: 750, desc: 'Chapter 1 Opening scene narration' },
        { id: 'ch1_panel_02', y0: 1200, h: 700, desc: 'Character dialogue & question bubble' },
        { id: 'ch1_panel_03', y0: 2100, h: 720, desc: 'Tower entrance dialogue' },
        { id: 'ch1_panel_04', y0: 3000, h: 750, desc: 'Dramatic encounter conversation' },
        { id: 'ch1_panel_05', y0: 4100, h: 750, desc: 'Action sound effect & dialogue' },
        { id: 'ch1_panel_06', y0: 5300, h: 700, desc: 'Speech bubble response' },
        { id: 'ch1_panel_07', y0: 6500, h: 800, desc: 'Chapter 1 climax panel dialogue' }
      ]
    },
    {
      num: 2,
      dir: 'chapter-2',
      url: 'https://image-comic.pstatic.net/webtoon/183559/2/20200224160711_5741f8c43bbf7235a1e0af70357fd9c7_IMAG01_1.jpg',
      slices: [
        { id: 'ch2_panel_01', y0: 200, h: 720, desc: 'Chapter 2 opening dialogue' },
        { id: 'ch2_panel_02', y0: 1100, h: 750, desc: 'Floor guardian conversation' },
        { id: 'ch2_panel_03', y0: 2200, h: 750, desc: 'Test explanation narrative panel' },
        { id: 'ch2_panel_04', y0: 3300, h: 750, desc: 'Shout / exclamation bubble' },
        { id: 'ch2_panel_05', y0: 4500, h: 700, desc: 'Character reaction speech bubble' },
        { id: 'ch2_panel_06', y0: 5600, h: 750, desc: 'Strategy dialogue panel' },
        { id: 'ch2_panel_07', y0: 6700, h: 800, desc: 'Chapter 2 closing panel' }
      ]
    }
  ];

  for (const ch of chapters) {
    console.log(`\nDownloading ${ch.dir} from ${ch.url}...`);
    await page.goto(ch.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    for (const slice of ch.slices) {
      const sliceData = await page.evaluate(({ y0, h }) => {
        const img = document.querySelector('img');
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, y0, img.naturalWidth, h, 0, 0, img.naturalWidth, h);
        return c.toDataURL('image/png');
      }, { y0: slice.y0, h: slice.h });

      const filePath = path.join(baseDir, ch.dir, `${slice.id}.png`);
      await fs.writeFile(filePath, Buffer.from(sliceData.split(',')[1], 'base64'));
      console.log(`Saved ${slice.id}.png (${slice.desc})`);
    }
  }

  await browser.close();
  console.log('\nDownloaded and saved 14 authentic Korean manhwa panels across 2 chapters!');
}

downloadAndSlice().catch(console.error);
