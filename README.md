<h1 align="center">
  <br>
  <a href="https://sametsahin.net/"><img src="https://sametsahin.net/images/collect-vars.svg" alt="collectvars" width="200"></a>
  <br>
  collectvars
  <br>
</h1>

<h4 align="center">collectvars highlights risky variables, and helps you understand code structure, while you casually browse.</h4>

</p>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#install">Install</a> •
  <a href="#demo">Demo</a> •
  <a href="#credits">Credits</a> •
  <a href="#similar-projects">Similar Projects</a> •
  <a href="#license">License</a>
</p>

![collectvars demo](/img/collectvars-demo.gif)

## Key Features

- No effort required
  - Alerts you when risky variables are detected while browsing
- Customizable
  - Use custom wordlists and variable names for scanning (list/watchlist.txt)
  - Supports RegExp, examples:
    - `^.*secret.*$`
    - `^.*password.*$`
    - `^.*api[_-]?key.*$`
    - `^.token.$`
- Scan external libraries
  - Checks variables from imported JS files
- Highlight dangerous variables
  - Shows only risky variables
- Ignore common libraries
  - Skips popular libraries like Google Analytics, Tracking, Advertising (list/denylist.txt)
- Ignore short variables
  - Doesn't display variables shorter than 3 chars, as they are likely minified variables
- Copy all variables/values with one click

## Install

1. Download as ZIP and unpack, or git clone
2. Enable `Developer Mode` in Extensions tab
3. Click `Load Unpacked`
4. Select `collectvars` folder
5. Done!

Here is a video showing how to install a Chrome extension:
[How to install unpacked extensions in chrome](https://www.youtube.com/watch?v=oswjtLwCUqg)

## Demo

See collectvars in action here:
[https://sametsahin.net/posts/bug-bounty-top-programs/](https://sametsahin.net/posts/bug-bounty-top-programs/)

## Credits

- [Claude 3.5 Sonnet](https://claude.ai/) - Coding
- [danielmiessler/SecLists](https://github.com/danielmiessler/SecLists) - Wordlists
- [hisxo/gitGraber](https://github.com/hisxo/gitGraber) - Wordlists
- [abdul-manaan/JS_Analysis](https://github.com/abdul-manaan/JS_Analysis) - Wordlists
- [phucbm/lipsum-generator](https://github.com/phucbm/lipsum-generator) - Design
- [@marc_louvion's LogoFast](https://logofa.st/) - Logo

## Similar Projects

- [trufflesecurity/Trufflehog-Chrome-Extension](https://github.com/trufflesecurity/Trufflehog-Chrome-Extension)
- [fransr/postMessage-tracker](https://github.com/fransr/postMessage-tracker)

## Contributing

This was a weekend project with no plans for new features. However, I'm open to ideas and contributions. Feel free to implement something if you'd like :)

## License

GPLv3

---

- Samet Sahin [sametsahin.net](https://sametsahin.net)
- LinkedIn [@sametsahinnet](https://www.linkedin.com/in/sametsahinnet)
- Twitter [@sametsahinnet](https://twitter.com/sametsahinnet)
