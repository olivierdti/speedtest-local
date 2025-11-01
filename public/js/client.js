(function () {
  const startBtn = document.getElementById('startBtn');
  const speedValue = document.getElementById('speedValue');
  const speedLabel = document.getElementById('speedLabel');
  const downloadStat = document.getElementById('downloadStat');
  const uploadStat = document.getElementById('uploadStat');
  const pingStat = document.getElementById('pingStat');
  const downloadBestEl = document.getElementById('downloadBest');
  const uploadBestEl = document.getElementById('uploadBest');
  const progressText = document.getElementById('progressText');
  const logEl = document.getElementById('log');
  const needle = document.getElementById('needle');
  const gaugeProgress = document.getElementById('gaugeProgress');

  function log(msg) {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function bpsToMbps(bps) {
    return (bps / 1024 / 1024).toFixed(2);
  }

  async function measurePing(numSamples = 5) {
    log('Mesure du ping...');
    const pings = [];
    
    for (let i = 0; i < numSamples; i++) {
      const t0 = performance.now();
      try {
        await fetch('/ping');
        const t1 = performance.now();
        const latency = t1 - t0;
        pings.push(latency);
      } catch (err) {
        log('Erreur ping: ' + err.message);
      }
      if (i < numSamples - 1) await new Promise(r => setTimeout(r, 100));
    }
    
    if (pings.length === 0) return null;
    const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
    log(`Ping: ${avgPing.toFixed(1)} ms (${pings.length} échantillons)`);
    return avgPing;
  }

  function updateGauge(speedMbps) {
    const maxSpeed = 200;
    const clampedSpeed = clamp(speedMbps, 0, maxSpeed);
    const percent = clampedSpeed / maxSpeed;
    const angle = -90 + (percent * 180);
    needle.style.transform = `rotate(${angle}deg)`;
    needle.style.transformOrigin = '100px 100px';
    
    const arcLength = 251.2;
    const offset = arcLength * (1 - percent);
    gaugeProgress.style.strokeDashoffset = offset;

    let color = '#10b981';
    if (speedMbps > 100) color = '#3b82f6';
    if (speedMbps > 150) color = '#a855f7';
    gaugeProgress.style.stroke = color;

    speedValue.textContent = Math.round(speedMbps);
  }

  async function measureDownloadStream(durationMs = 10000) {
    log(`Test download: ${durationMs / 1000}s (multi-connexion)`);
    speedLabel.textContent = 'DOWNLOAD';
    
    const numConnections = 4;
    let totalBytes = 0;
    let bestMbps = 0;
    const samples = [];
    const start = performance.now();

    async function downloadConnection(connId) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), durationMs);
      let bytes = 0;

      try {
        const resp = await fetch('/download-stream', { signal: controller.signal });
        const reader = resp.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const now = performance.now();
          bytes += value.byteLength;
          totalBytes += value.byteLength;
          
          samples.push({ t: now, b: value.byteLength });
          const cutoff = now - 1000;
          while (samples.length && samples[0].t < cutoff) samples.shift();
          const bytesWindow = samples.reduce((s, x) => s + x.b, 0);
          const bpsWindow = (bytesWindow * 8) / 1;
          const mbpsWindow = parseFloat(bpsToMbps(bpsWindow));
          if (mbpsWindow > bestMbps) bestMbps = mbpsWindow;
          
          updateGauge(mbpsWindow);
          downloadBestEl.textContent = `${bestMbps.toFixed(2)} Mbps`;
          
          const elapsed = performance.now() - start;
          progressText.textContent = `Download: ${mbpsWindow.toFixed(1)} Mbps (${Math.round(elapsed/1000)}/${durationMs/1000}s)`;
        }
      } catch (err) {
        if (err.name !== 'AbortError') log(`Erreur download conn ${connId}: ${err.message}`);
      } finally {
        clearTimeout(timeout);
      }
      return bytes;
    }

    const promises = [];
    for (let i = 0; i < numConnections; i++) {
      promises.push(downloadConnection(i));
    }
    
    await Promise.all(promises);

    const duration = (performance.now() - start) / 1000;
    const avgBps = (totalBytes * 8) / duration;
    log(`Download terminé: ${totalBytes} octets en ${duration.toFixed(2)}s (${numConnections} connexions)`);
    return { bytes: totalBytes, duration, avgMbps: parseFloat(bpsToMbps(avgBps)), bestMbps };
  }

  async function measureUploadStream(durationMs = 10000) {
    log(`Test upload: ${durationMs / 1000}s (multi-connexion)`);
    speedLabel.textContent = 'UPLOAD';
    const chunkSize = 1024 * 1024;
    const chunk = new Uint8Array(chunkSize);
    for (let i = 0; i < chunk.length; i += 4096) chunk[i] = i % 256;

    let bytesSent = 0;
    let bestMbps = 0;
    const samples = [];
    const start = performance.now();

    const supportsStreaming = (function () {
      try {
        new Request('', { method: 'POST', body: new ReadableStream({ pull() {} }) });
        return true;
      } catch (e) {
        return false;
      }
    })();

    async function measureUploadLoop() {
      let bytes = 0;
      let best = 0;
      const samplesLoop = [];
      const loopStart = performance.now();
      const numConnections = 4;

      async function sendChunkLoop(connId) {
        while (performance.now() - loopStart < durationMs) {
          const now = performance.now();
          try {
            const p = await fetch('/upload', { method: 'POST', body: chunk });
            const j = await p.json().catch(() => null);
            const rec = j && j.received ? j.received : chunk.length;
            bytes += rec;
            
            samplesLoop.push({ t: performance.now(), b: rec });
            const cutoff = performance.now() - 1000;
            while (samplesLoop.length && samplesLoop[0].t < cutoff) samplesLoop.shift();
            const bytesWindow = samplesLoop.reduce((s, x) => s + x.b, 0);
            const bpsWindow = (bytesWindow * 8) / 1;
            const mbpsWindow = parseFloat(bpsToMbps(bpsWindow));
            if (mbpsWindow > best) best = mbpsWindow;
            
            updateGauge(mbpsWindow);
            uploadBestEl.textContent = `${best.toFixed(2)} Mbps`;
            
            const elapsed = performance.now() - loopStart;
            progressText.textContent = `Upload: ${mbpsWindow.toFixed(1)} Mbps (${Math.round(elapsed/1000)}/${durationMs/1000}s)`;
          } catch (err) {
            log(`Erreur upload chunk (conn ${connId}): ` + (err.message || err));
            break;
          }
        }
      }

      const promises = [];
      for (let i = 0; i < numConnections; i++) {
        promises.push(sendChunkLoop(i));
      }
      
      await Promise.all(promises);

      const dur = (performance.now() - loopStart) / 1000;
      const avgBps = (bytes * 8) / dur;
      log(`Upload terminé: envoyé ~${bytes} octets en ${dur.toFixed(2)}s (${numConnections} connexions)`);
      return { bytes, duration: dur, avgMbps: parseFloat(bpsToMbps(avgBps)), bestMbps: best };
    }

    if (!supportsStreaming) {
      log('ReadableStream non supporté, utilisation du fallback POST-loop');
      const res = await measureUploadLoop();
      return res;
    }

    let respJson = null;
    try {
      const stream = new ReadableStream({
        pull(controller) {
          const now = performance.now();
          if (now - start >= durationMs) {
            controller.close();
            return;
          }
          controller.enqueue(chunk);
          bytesSent += chunk.length;
          samples.push({ t: now, b: chunk.length });
          const cutoff = now - 1000;
          while (samples.length && samples[0].t < cutoff) samples.shift();
          const bytesWindow = samples.reduce((s, x) => s + x.b, 0);
          const bpsWindow = (bytesWindow * 8) / 1;
          const mbpsWindow = parseFloat(bpsToMbps(bpsWindow));
          if (mbpsWindow > bestMbps) bestMbps = mbpsWindow;
          
          updateGauge(mbpsWindow);
          uploadBestEl.textContent = `${bestMbps.toFixed(2)} Mbps`;
          
          const elapsed = performance.now() - start;
          progressText.textContent = `Upload: ${mbpsWindow.toFixed(1)} Mbps (${Math.round(elapsed/1000)}/${durationMs/1000}s)`;
        }
      });

      const resp = await fetch('/upload', { method: 'POST', body: stream });
      respJson = await resp.json().catch(() => null);
    } catch (err) {
      log('Erreur upload streaming: ' + (err.message || err) + ' — fallback vers POST-loop');
      const res = await measureUploadLoop();
      return res;
    }

    const duration = (performance.now() - start) / 1000;
    const avgBps = (bytesSent * 8) / duration;
    log(`Upload terminé: envoyé ~${bytesSent} octets en ${duration.toFixed(2)}s`);
    const serverReceived = respJson && respJson.received ? respJson.received : bytesSent;
    if (serverReceived <= chunkSize * 2) {
      log('Streaming a envoyé trop peu, utilisation du fallback POST-loop');
      const res = await measureUploadLoop();
      return res;
    }
    return { bytes: serverReceived, duration, avgMbps: parseFloat(bpsToMbps(avgBps)), bestMbps };
  }

  async function runTest() {
    if (window.IS_LOCALHOST) {
      log('Test bloqué : accès depuis le serveur local');
      alert('⚠️ Test bloqué\n\nVous accédez au speedtest depuis le même PC que le serveur.\nPour tester votre réseau, utilisez un autre appareil.');
      return;
    }

    startBtn.disabled = true;
    startBtn.textContent = '...';
    speedLabel.textContent = 'TEST EN COURS';
    progressText.textContent = 'Initialisation...';
    pingStat.textContent = '—';
    downloadStat.textContent = '—';
    uploadStat.textContent = '—';
    updateGauge(0);

    try {
      speedLabel.textContent = 'PING';
      progressText.textContent = 'Mesure de la latence...';
      const ping = await measurePing(5);
      if (ping !== null) {
        pingStat.textContent = `${Math.round(ping)} ms`;
      } else {
        pingStat.textContent = 'N/A';
      }
      
      await new Promise(r => setTimeout(r, 500));

      const dl = await measureDownloadStream(10000);
      downloadStat.textContent = `${dl.avgMbps.toFixed(1)} Mbps`;
      log(`Download moyen: ${dl.avgMbps.toFixed(2)} Mbps, meilleur: ${dl.bestMbps.toFixed(2)} Mbps`);
      
      await new Promise(r => setTimeout(r, 500));
      speedLabel.textContent = 'UPLOAD';
      progressText.textContent = 'Préparation upload...';
      updateGauge(0);

      const ul = await measureUploadStream(10000);
      uploadStat.textContent = `${ul.avgMbps.toFixed(1)} Mbps`;
      log(`Upload moyen: ${ul.avgMbps.toFixed(2)} Mbps, meilleur: ${ul.bestMbps.toFixed(2)} Mbps`);

      speedLabel.textContent = 'TERMINÉ';
      progressText.textContent = 'Test terminé!';
      log('Tous les tests sont terminés');
    } catch (err) {
      log('Erreur pendant le test: ' + (err.message || err));
      speedLabel.textContent = 'ERREUR';
      progressText.textContent = 'Erreur lors du test';
      downloadStat.textContent = 'Erreur';
      uploadStat.textContent = 'Erreur';
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = 'GO';
    }
  }

  startBtn.addEventListener('click', () => runTest());

  pingStat.textContent = '—';
  updateGauge(0);
})();
