# DNS security records for bqurtas.com

Apply these in **Cloudflare → bqurtas.com → DNS → Records**.
Do not apply them at Spaceship unless nameservers are still Cloudflare.

Nameservers must stay:

```text
chuck.ns.cloudflare.com
lovisa.ns.cloudflare.com
```

## Email — send and receive (SpaceMail)

These records are the durable setup. They authenticate mail without being so strict
that a SpaceMail infrastructure change silently stops delivery.

Replace the current MX records so both have priority **0**:

```dns
@  MX  0  mx1.spacemail.com
@  MX  0  mx2.spacemail.com
```

Replace the current SPF TXT at `@`:

```dns
@  TXT  "v=spf1 include:spf.spacemail.com ~all"
```

Keep the SpaceMail DKIM TXT (do not delete it):

```dns
spacemail._domainkey  TXT  "v=DKIM1; k=rsa; p=<EXISTING_SPACEMAIL_PUBLIC_KEY>"
```

Replace DMARC. Relaxed alignment is required so SpaceMail can send; quarantine
still sends spoofed mail to spam:

```dns
_dmarc  TXT  "v=DMARC1; p=quarantine; pct=100; rua=mailto:hello@bqurtas.com; ruf=mailto:hello@bqurtas.com; fo=1; adkim=r; aspf=r; sp=quarantine"
```

Add the missing autodiscover / Apple Mail SRV records (DNS only, never proxied):

```dns
_autodiscover._tcp   SRV  0 0 443 autoconfig.spacemail.com
_imaps._tcp          SRV  0 1 993 mail.spacemail.com
_submissions._tcp    SRV  0 1 465 mail.spacemail.com
_submission._tcp     SRV  0 1 587 mail.spacemail.com
```

Add these CNAMEs so mail apps find the servers automatically (proxied is OK):

```dns
autoconfig     CNAME  bqurtas.com
autodiscover   CNAME  bqurtas.com
```

## MTA-STS and TLS reports

Policy file (shipped by this repo):

```text
https://mta-sts.bqurtas.com/.well-known/mta-sts.txt
```

Mode is **testing** on purpose: Gmail/Outlook still report TLS problems, but they
will not refuse inbound mail if SpaceMail has a brief certificate glitch.

```dns
_mta-sts    TXT  "v=STSv1; id=2026081301"
_smtp._tls  TXT  "v=TLSRPTv1; rua=mailto:hello@bqurtas.com"
mta-sts     CNAME  bqurtas.com
```

Bump the `id` whenever the policy file changes.

## Mail client settings

Do **not** use `imap.spacemail.com` or `smtp.spacemail.com`.
`imap.spacemail.com` does not exist. Use:

| | Value |
|---|---|
| Email | `hello@bqurtas.com` |
| Username | `hello@bqurtas.com` |
| Incoming (IMAP) | `mail.spacemail.com` port **993** SSL/TLS |
| Outgoing (SMTP) | `mail.spacemail.com` port **465** SSL/TLS |
| Webmail | https://www.spacemail.com/mail/ |

## CAA for Cloudflare Universal SSL

```dns
@  CAA  0 issue     "pki.goog; cansignhttpexchanges=yes"
@  CAA  0 issuewild "pki.goog; cansignhttpexchanges=yes"
@  CAA  0 issue     "letsencrypt.org"
@  CAA  0 issuewild "letsencrypt.org"
@  CAA  0 issue     "ssl.com"
@  CAA  0 issuewild "ssl.com"
@  CAA  0 issue     "sectigo.com"
@  CAA  0 issue     "comodoca.com"
@  CAA  0 issue     "digicert.com; cansignhttpexchanges=yes"
@  CAA  0 iodef     "mailto:hello@bqurtas.com"
```

## DNSSEC and registrar locks

Enable DNSSEC in Cloudflare, then copy the generated DS record to Spaceship.

At Spaceship, enable if available:

```text
clientDeleteProhibited
clientUpdateProhibited
```

## What must never be changed

- Do not enable Cloudflare Email Routing while SpaceMail MX records exist.
- Do not proxy MX / TXT / SRV / DKIM records.
- Do not add a second SPF TXT. There must be exactly one SPF record at `@`.
- Do not set DMARC `p=reject` or `adkim=s; aspf=s` unless SpaceMail sending has
  been confirmed clean for several weeks.
