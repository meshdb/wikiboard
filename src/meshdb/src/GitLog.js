import { GitRepo } from './GitRepo'
import { GitCommit } from './GitCommit'

export class GitLog {
  static async log ({repo, sha, ref, maxlen = 30}) {
    if (sha && ref) throw new Error('Cannot specify both sha and ref arguments to GitLog.log')
    if (ref) {
      // TODO: make this better?
      try {
        sha = await GitRepo.getBranch({repo, ref})
      } catch (e) {
        try {
          sha = await GitRepo.getTag({repo, ref})
        } catch (e) {
          throw new Error(`Cannot find reference "${ref}" in repo "${repo}"`)
        }
      }
    }
    var commit
    // walk the line
    var queue = new Set()
    queue.add(sha)
    var commitList = []
    var i = 1
    for (let sha of queue) {
      commit = await GitRepo.getObject({repo, sha})
      commitList.push(commit)
      commit = GitCommit.parse(commit)
      for (let psha of commit.headers.parent) {
        if (i++ < maxlen) {
          queue.add(psha)
        }
      }
    }
    return commitList
  }
  // TODO: support --date-order, --topo-order, --author-date-order, --reverse
  static async graph ({repo, refs, maxlen = 30}) {
    if (!refs) {
      refs = await GitRepo.listBranches({repo})
    }
    let commitset = new Set()
    // Iterate over all the branches, grabbing up to maxlen ancestors
    for (let ref of refs) {
      let commits = await GitLog.log({repo, ref, maxlen})
      for (let commit of commits) {
        commitset.add(commit)
      }
    }
    // Sort by date
    let commits = []
    for (let commit of commitset) {
      commits.push(GitCommit.parse(commit))
    }
    // TODO: Check for commits missing author or timestamp
    let sorter = (a, b) => b.headers.author.timestamp - a.headers.author.timestamp
    commits.sort(sorter)
    // Because of the topology, this is actually going to be pretty efficient,
    // because most of the time it will find the parent of n at n+1
    let scanAncestors = (sha, n) => {
      for (; n < commits.length; n++) {
        if (commits[n].sha === sha) {
          return commits[n]
        }
      }
    }
    // Construct topology
    // (sorting by date should also have sorted them topologically)
    for (let n = 0; n < commits.length; n++) {
      // Assign row numbers (the easy part)
      commits[n].row = n
      // Move parent property out of headers so we don't go crazy
      commits[n].parent = commits[n].headers.parent
      // Add an empty children array to each commit
      commits[n].children = []
    }
    // Connect ancestors to children
    for (let n = 0; n < commits.length; n++) {
      for (let sha of commits[n].headers.parent) {
        let p = scanAncestors(sha, n)
        p.children.push(commits[n].sha)
      }
    }
    // // Assign column numbers
    let ncol = 0 // number of columns in use
                 // or the index of the next available column depending on how you think of it.
    let columnReservations = [] // a list of shas, one per column, that is the next ancestor expected
                                // to be in that column
    let grid = [] // 2D array [row][col] = sha
    // traverse in order
    for (let n = 0; n < commits.length; n++) {
      let c = commits[n]
      // If this commit doesn't have a column reservation, make a new column
      // reservation at the far right. Now it is not a special case.
      if (!columnReservations.includes(c.sha)) {
        columnReservations.push(c.sha)
      }
      // Add a copy of this row's column designations to the grid
      grid.push(columnReservations.slice())
      // Find the commit's column reservation
      c.col = columnReservations.indexOf(c.sha)
      c.columns = columnReservations.slice()
      // Splice all the parents of this commit into reserved columns,
      // taking care to consider they might already have a reservation
      let parentsWhoNeedColumns = c.parent.filter(x => !columnReservations.includes(x))
      columnReservations.splice(c.col, 1, ...parentsWhoNeedColumns)
      // Now all parents have a reservation! Lets record where the parent lines should go
      c.parentColumns = c.parent.map(x => columnReservations.indexOf(x))
    }
    // Display results
    grid = ''
    for (let r = 0; r < commits.length; r++) {
      let commit = commits[r]
      for (let c of commit.columns) {
        if (c === commit.sha) {
          grid += '* '
        } else {
          grid += '| '
        }
      }
      grid += ` ${commit.sha.slice(0,7)} - ${commit.message.replace(/\n.*/g, '')}\n`
      // Draw line(s) from c.col to c.parentColumns
    }
    console.log(grid)
    return commits
  }
    
/**
 * BAsic algorithm: (deterministic, no backtracking, compact)
 * Again order all commits
 * Let n = 0, j = -1
 * let ncol = 0 // number of columns in use
 *              // or the index of the next available column depending on how you think of it.
 * for (let n = 0; n < commits.length; n++) {
 *   let commit = commits[n]
 *   if (commit.children.length === 0) {
 *     // Add a new column on the far right.
 *     commit.column = ncol
 *     ncol++
 *   } else {
 *     // assign it to the same column as its left-most child
 *     commit.column = Array.min(commit.children.map(x => x.column))
 *   }
 *   let c = commit.column
 *   // merge commits
 *   for (let i = 0; i < commit.parents.length; i++) {
 *     commit.parents[i].column = c + i
 *     if (i > 0) {
 *     // insert a column, scooting all columns below and to the right by 1
 *       for commits with row > n and col > c {
 *         commit.col++
 *       }
 *     }
 *   }
 *   // branch commits
 *   if (commit.children.length > 1) {
 *     // free up columns below and to the right by shifting them left by 1
 *     ncol = ncol - (commit.children.length - 1)
 *   }
 */

  
}