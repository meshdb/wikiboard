'use strict'
// Roughly follows the spirit of the git "smart" http transport... but without the shitty parts.

// To get the list of refs, we support the "dumb" HTTP protocol
GET $REPO/info/refs
// Now instead of the ridiculous "smart" protocol & negotiation phase, we simply
// combine what we "want" and what we "have" into one request
GET $REPO/fetch?want[]={SHA or branch name}&want[]={SHA2 or branchname2}&have[]=SHA&have[]=SHA
// Then the server responds with paginated JSON:
{ "page": 1,
  "next": "http://$REPO/fetch?...&page=2",
  "objects": {
    "{SHA1}": {"encoding": "utf8", "data": "{data}"},
    "{SHA2}": {"encoding": "base64", "data": "{data}"}
  },
  "branches": {
    "branchName1": "{SHA1}"
  },
  "tags": {
    "tag1": "{SHA1}",
    "tag1^{}": "{SHA1-}"
  }
}
// This should be much easier for people to deal with.
// Exceptions:
// Branch name or commit sha specified in 'want' not found: return 404 with missing branches/commits listed
//   so the user can remove them from the request and try again
// Question: what should the server do if one of the 'have's is not in the database? I'm not sure...
