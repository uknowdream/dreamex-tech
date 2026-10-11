<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="rss/channel/title"/> — RSS Feed</title>
        <style>
          :root{color-scheme:dark;--bg:#080d18;--panel:#111a2a;--line:#24334a;--text:#edf4ff;--muted:#9aabc3;--accent:#78a9ff}
          *{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top,#142443 0%,var(--bg) 55%);color:var(--text);font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
          main{width:min(920px,calc(100% - 32px));margin:0 auto;padding:48px 0 72px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:12px;color:var(--accent);font-weight:700}
          h1{font-size:clamp(32px,6vw,52px);line-height:1.1;letter-spacing:-.04em;margin:12px 0}.intro{color:var(--muted);max-width:680px;margin-bottom:28px}
          .top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.subscribe{display:inline-block;padding:10px 15px;border:1px solid #42659a;border-radius:10px;color:var(--text);text-decoration:none;background:#142747}
          .meta{color:var(--muted);font-size:13px;margin:24px 0 12px}.item{background:linear-gradient(145deg,rgba(20,32,52,.96),rgba(13,21,35,.96));border:1px solid var(--line);border-radius:16px;padding:22px 24px;margin:14px 0;box-shadow:0 12px 30px #0002}
          .date{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);font-weight:700}.item h2{font-size:21px;line-height:1.35;margin:8px 0}.item h2 a{color:var(--text);text-decoration:none}.item h2 a:hover{color:var(--accent)}
          .summary{color:#bdc9db;margin:0 0 16px}.read{color:var(--accent);font-weight:650;text-decoration:none}.footer{border-top:1px solid var(--line);margin-top:32px;padding-top:20px;color:var(--muted);font-size:13px}.footer a{color:var(--accent)}
          @media(max-width:560px){main{padding-top:30px}.item{padding:18px}.top{align-items:flex-start}}
        </style>
      </head>
      <body><main>
        <div class="top"><div><div class="eyebrow">Engineering notes · RSS</div><h1><xsl:value-of select="rss/channel/title"/></h1></div><a class="subscribe" href="/rss.xml">Open raw feed ↗</a></div>
        <p class="intro"><xsl:value-of select="rss/channel/description"/></p>
        <div class="meta"><xsl:value-of select="count(rss/channel/item)"/> articles · Newest first · <xsl:value-of select="rss/channel/language"/></div>
        <section>
          <xsl:for-each select="rss/channel/item">
            <xsl:sort select="pubDate" order="descending"/>
            <article class="item"><div class="date"><xsl:value-of select="pubDate"/></div><h2><a><xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute><xsl:value-of select="title"/></a></h2><p class="summary"><xsl:value-of select="description"/></p><a class="read"><xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>Read article →</a></article>
          </xsl:for-each>
        </section>
        <div class="footer">Published by <a href="https://dreamex.tech/">DreamEx Tech</a>. This is a styled preview of the RSS feed; subscribe using <a href="/rss.xml">the feed URL</a>.</div>
      </main></body>
    </html>
  </xsl:template>
</xsl:stylesheet>
