## Wallet Security Notes

* Production systems must disable core dumps before handling generated Stellar secrets.
* Use `ulimit -c 0` or the platform equivalent to prevent crash dumps from capturing wallet material.
* Avoid logging `secret` values, even in debug builds.
