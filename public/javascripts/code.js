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
            container: document.getElementById('main2'),

            boxSelectionEnabled: false,
            autounselectify: false,
            autoungrabify: true,
            maxZoom: 2,
            minZoom: 0.5,

            elements: init(),

            layout: {
                name: 'preset'
            },

            style: dataArray[0],
            elements: dataArray[1]
        });

        cy.nodes().style({"font-size": 1})
    });

function init(data) {
    var final = [];
    var counts = [0, 0, 0, 0];
    for (var node in data) {
        var obj = {};
        obj.data = {id:node};
        obj.selected = false;
        obj.position = {
            x: params["y-start-" + data[node].year],
            y: params["x-start"] + params["x-interval"] * counts[data[node].year - 1]
        };
        counts[data[node].year - 1]++;
        final.push(obj);
        for (var prereq of getAllPrereqs(data[node].prereqs)) {
            final.push({data:{id: prereq + node, target: node, source: prereq}, group:"edges"});
        }
    }
    console.log(final);
    return final;
}

function getAllPrereqs(arr) {
    var final = [];
    for (var option of arr) {
        var key = Object.keys(option)[0];
        if (key === "course") {
            final.push(option[key]);
        } else {
            final = final.concat(getAllPrereqs(option[key]));
        }
    }
    return final;
}

cy.on('cxttap', 'node', function(evt){
    var node = evt.target;
    attemptSelection(node);
});

function attemptSelection(node) {
    var good = true;
    node.connectedEdges("[target = \"" + node.id() + "\"]").forEach(function(current, i, all) {
        console.log(current.id());
        if (!current.selected()) {
            good = false;
        }
    });
    if (good) {
        node.select();
        node.connectedEdges("[source = \"" + node.id() + "\"]").forEach(function(current, i, all) {
            current.select();
        })
    }
}
