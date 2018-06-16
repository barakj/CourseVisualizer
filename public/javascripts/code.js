Promise.all([
    fetch('javascripts/cy-style.json', {mode: 'no-cors'})
        .then(function(res) {
            return res.json()
        }),
    fetch('javascripts/data.json', {mode: 'no-cors'})
        .then(function(res) {
            return res.json()
        })
])
    .then(function(dataArray) {
        var cy = window.cy = cytoscape({
            container: document.getElementById('cy'),

            boxSelectionEnabled: false,
            autounselectify: true,

            layout: {
                name: 'preset'
            },

            style: dataArray[0],
            elements: dataArray[1]
        });

        cy.nodes().style({"font-size": 1})
    });
