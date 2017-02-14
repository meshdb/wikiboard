Final artifact: a single page application

This SPA will:

- Load a git repo from Github
- render that git repo as a combined wiki + comment thread
- Use "Login with Github" to get an auth token and libopenpgp to create a signing keypair for that user
- Interpret wiki edits, additional comments, and comment edits as signed git commits
- Insert these git commits into an IndexedDb/leveldb style interface, indexed by parents.
- Distribute these git objects via a peer mesh network using WebRTC

There is a backend component:

- A bot, under the control of the forum administrator, will have write permission to the github repo
  (possibly be the only one with write permission)
- As it receives git objects over the mesh network, it will choose which commits to add to the github 
  repo. The heuristics for inclusion can be:
  1. Commits must be signed with a key verified by Github. Simple to integrate with the Login with Github.
  2. Spam filters
  3. Commits are approved by moderators, where approval is when a moderator (whose public key is established
     a priori) signs a commit pointing at the user-submitted commit. Some kind of convention for applying
     labels to commits would be established so moderation systems wouldn't be fractured.
  4. Again, commiting it to Github isn't technically necessary if the thread is being seeded, since all
     clients can choose to filter commits by signed moderation commits or spam filters at the client level.
     However, someone somewhere needs to keep a permanent record in case the thread goes silent and needs
     to be found via Google or something. Therefore, having a permanent seed hosted by Github provides
     convenient security and encourages creative thinking in terms of forum backup solutions, "forking"
     forums, forum submodules, using "deploy hooks" to do thread notifications, and provides a nice 
     graphical interface for "manually debugging" forums, and maybe using git-filter-branch to do 
     mass edits or migrations.

Just for kicks, comments are written in Markdown.
