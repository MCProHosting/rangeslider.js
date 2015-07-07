# rangeslider.js

This is a fork of [rangeslider.js](https://github.com/andreruffert/rangeslider.js), dropping its dependency on jQuery and nearly halving the filesize of the plugin itself.

```
Minified and gzipped sizes:

Before: 2468 bytes (rangeslider) + 37298 bytes (jquery) = 39766 bytes
After:  1641 bytes (rangeslider)                        = 1641 bytes

Saved 38125 bytes (96%).
```

Usage is similar, but slightly different. Same options and everything, but rather than calling `$(el).rangeslider`, it looks like this:

```js
var slider = rangeslider(element, {
    polyfill: false
    // ...
});

slider.update(true); // instead of $(el).rangeslider('update', true);

slider.destroy(); // instead of $(el).rangeslider('destroy');
```
