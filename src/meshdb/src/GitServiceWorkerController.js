
export class GitServiceWorkerController {
  static async register (path) {
    if (!navigator.serviceWorker) return;

    let reg = await navigator.serviceWorker.register(path)
    if (!navigator.serviceWorker.controller) return

    if (reg.waiting) {
      _updateReady(reg.waiting)
      return
    }

    if (reg.installing) {
      _trackInstalling(reg.installing)
      return
    }

    reg.addEventListener('updatefound', function() {
      _trackInstalling(reg.installing)
    })

    // Ensure refresh is only called once.
    // This works around a bug in "force update on reload".
    var refreshing
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (refreshing) return
      window.location.reload()
      refreshing = true
    })
  }
}

function _trackInstalling (worker) {
  worker.addEventListener('statechange', function() {
    if (worker.state == 'installed') {
      _updateReady(worker);
    }
  });
};

function _updateReady (worker) {
  var toast = this._toastsView.show("New version available", {
    buttons: ['refresh', 'dismiss']
  });

  toast.answer.then(function(answer) {
    if (answer != 'refresh') return;
    worker.postMessage({action: 'skipWaiting'});
  });
};
