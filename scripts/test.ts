import fetch from 'node-fetch';
fetch("https://bsky.social/oauth/par", {
  "headers": {
    "accept": "*/*",
    "accept-language": "ja,en-US;q=0.9,en;q=0.8",
    "cache-control": "no-cache",
    "content-type": "application/x-www-form-urlencoded",
    "dpop": "eyJhbGciOiJFUzI1NiIsInR5cCI6ImRwb3Arand0IiwiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiTkpIWXYyU1RvcjZtSXlFMzNjV0RJb1BkNzdVaFZyQmZkQk5SLTl0c2pDYyIsInkiOiJObEVkWmZjZUs2OHg5M3kxLU43LU0tai1ZQmRrVkZrdER6VFRTOC02WFJ3In0sImtpZCI6Ijk2NzU1M2VhLTMzOWUtNDAzYS1iYWM5LTdlZmQ3MGQwNDc2MSJ9.eyJpYXQiOjE3NzA3MTIwNzIsImp0aSI6InJxdDEyMHZwbmQiLCJodG0iOiJQT1NUIiwiaHR1IjoiaHR0cHM6Ly9ic2t5LnNvY2lhbC9vYXV0aC9wYXIiLCJub25jZSI6IjhuT21kdG5MRmRZT1VUUVhqZnBGNDBDT1Q4VE9QSHBDX0hwU0xIdHZMUEEifQ.ezCLTAGF84FtB00rKsqJWOG05v37ZZs4mhBC2YiBh3w94ZOpWBivpT6x1l8wykRTj-TjXrSEoi5FBsjaUdznDw",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"144\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "Referer": "https://bsky-demo-client.vercel.app/"
  },
  "body": "state=9EFgooNgnbOW4MGqzfgXmw&scope=atproto+include%3Aapp.bsky.authFullApp%3Faud%3Ddid%3Aweb%3Aapi.bsky.app%23bsky_appview+include%3Aapp.chronosky.authClient%3Faud%3Ddid%3Aweb%3Aapi.chronosky.app+blob%3Aimage%2F*+blob%3Avideo%2F*&client_id=https%3A%2F%2Fbsky-demo-client.vercel.app%2Fclient-metadata.json&redirect_uri=https%3A%2F%2Fbsky-demo-client.vercel.app%2Foauth%2Fcallback&code_challenge=-K_-zL8cghz_30dVKNdlajrcPW-FFdBRyI86te_XhvQ&code_challenge_method=S256&login_hint=anon5r.com&response_mode=query&response_type=code",
  "method": "POST"
});