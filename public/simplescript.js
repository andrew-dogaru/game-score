function submitFormJSON(formId, params) {
  var form = document.getElementById(formId);
  var obj = new Object();
  obj.userid = form.userid.value;
  obj.password = form.password.value;

  fetch(params.submitUrl, {
      method: "POST",
      mode: "same-origin",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj)
    })
    .then(function(response) {
      logResponse(response);
      return response.json();
    })
    // process response and pull the next page
    .then(function(data) {
      logResponseData(data);
      if (!data) {
        alert('Unknown error');
        window.location.href = params.errorUrl;
      }
      if (!data.success) {
        alert(data.message);
        window.location.href = params.errorUrl;
      }
      else {
        // success, store token, send it as a query parameter
        window.localStorage.setItem('token', data.token);
        window.localStorage.setItem('userName', obj.userid)
        window.location.href = params.successUrl + '?' + getStoredQueryParams();
      }
    })
    .catch(function(err) {
      console.log("Error: " + err.message);
    });
}

function getStoredQueryParams(url) {
  return 'name=' + window.localStorage.getItem('userName') + 
      '&token=' + window.localStorage.getItem('token');
}

function removeStorage() {
  window.localStorage.removeItem('userName');
  window.localStorage.removeItem('token');
}

function logResponse(response) {
  console.log(response.headers.get('Content-Type'));
  console.log(response.headers.get('Date'));
  console.log(response.status);
  console.log(response.statusText);
  console.log(response.type);
  console.log(response.url);
}

function logResponseData(data) {
  console.log('data=');
  console.log(data);
}
