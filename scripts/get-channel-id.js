fetch('https://www.youtube.com/@purplelease')
  .then((r) => r.text())
  .then((t) => {
    const m = t.match(/"channelId":"(UC[^"]+)"/);
    console.log(m ? m[1] : 'not found');
  });
