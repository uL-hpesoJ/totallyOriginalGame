$(function () {
    var canvas = $('#mainCanvas')[0];
    var ctx = canvas.getContext('2d');
    var blockSize;
    var keysDown = [];
    var viewWidth = 30;
    var animationCycleCounter = 0;
    var debugOverlay = false;
    var temporaryValues = {
        debugOverlay: false
    };
    var collisions = [];
    const modes = {
        menu: 0
        , game: 1
        , builder: 2
    }
    const playerStates = {
        onGround: 0
        , air: 1
        , jumpSquat: 2
    }

    function resizeCanvas() {
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
        blockSize = canvas.width / 30;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        ctx.imageSmoothingEnabled = false;
        ctx.translate(0, -blockSize);
    }

    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

    function getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
    //compares to see if num1 and 2 are within range of each other. returns true or false
    function isWithin(num, range1, range2) {
        if (num > range1 && num < range2 || num < range1 && num > range2) {
            return true;
        }
        else {
            return false;
        }
    }

    function combinedDifference(testingNum, num1, num2) {
        return difference(testingNum, num1) + difference(testingNum, num2);
    }

    function difference(num1, num2) {
        return Math.abs(num1 - num2);
    }

    function insideBlock(objectOne, objectTwo) {
        var xin = false;
        var yin = false;
        var testingWidth = absoluteValue(objectTwo.x[0] - objectTwo.x[1]);
        var testingHeight = absoluteValue(objectTwo.y[0] - objectTwo.y[1]);
        //todo eventually maybe replace this with a function that uses the average difference.
        if (isWithin(objectOne.x[0], objectTwo.x[0], objectTwo.x[1]) || isWithin(objectOne.x[1], objectTwo.x[0], objectTwo.x[1]) || isWithin(objectTwo.x[0], objectOne.x[0], objectOne.x[1]) || isWithin(objectTwo.x[1], objectOne.x[0], objectOne.x[1])) {
            xin = true;
        }
        if (isWithin(objectOne.y[0], objectTwo.y[0], objectTwo.y[1]) || isWithin(objectOne.y[1], objectTwo.y[0], objectTwo.y[1]) || isWithin(objectTwo.y[0], objectOne.y[0], objectOne.y[1]) || isWithin(objectTwo.y[1], objectOne.y[0], objectOne.y[1])) {
            yin = true;
        }
        return {
            'x': xin
            , 'y': yin
        };
    }

    function delay(code, timeMs) {
        window.setInterval(code(), timeMs);
    }

    function approachZero(difference, number) {
        var subtracted = number - difference;
        var added = number + difference;
        var returnValue;
        if (absoluteValue(subtracted) >= absoluteValue(added)) {
            returnValue = added;
        }
        else if (absoluteValue(subtracted < absoluteValue(added))) {
            returnValue = subtracted;
        }
        return returnValue;
    }

    function loadImages(path, count) {
        var returnVal = [];
        for (var i = 0; i < count; i++) {
            returnVal.push(loadImage(path + (i) + '.png'));
        }
        return returnVal;
    }
    var blocks = {
        basic: loadImage('img/sprites/blocks/basic.png')
    };
    var sprites = {
        idle: loadImage('img/sprites/zeeTee/idle.png')
        , jumpsquat: loadImage('img/sprites/zeeTee/jumpsquat.png')
        , airUp: loadImage('img/sprites/zeeTee/airUp.png')
        , airDown: loadImage('img/sprites/zeeTee/airDown.png')
        , walk: loadImages('img/sprites/zeeTee/walk', 3)
        , crouch: loadImage('img/sprites/zeeTee/crouch.png')
    }
    var mc = { //all the info on the mc
        facing: 1, // 0 is left, 1 is right
        x: 17
        , y: 10
        , velx: 0
        , vely: 2
        , camerax: 0
        , cameray: 0
        , onGround: false
        , accelx: 0.05
        , airAccelx: 0.02
        , friction: 0.01
        , airFriction: 0.001
        , walkSpeed: 0.15
        , runSpeed: 0.3
        , gravity: 0.1
        , fastFallGravity: 0.2
        , fallSpeed: 4
        , fastFallSpeed: 6
        , fullHop: 2, //enough to jump around 5 blocks
        shortHop: 0.8
        , jumpsquatDuration: 3, //in frames
        jumpSpeed: 3
        , displayWidth: 1
        , width: 0.8
        , height: 0.8 //if you choose exactly the same value as a block, it causes collision issues.
            
        , displayHeight: 1
        , scrollMultiplier: 5
        , state: playerStates.onGround
    };
    var controls = {
        left: 65
        , right: 68
        , down: 83
        , up: 87
        , sprint: 16
        , jump: 32
    };
    window.onresize = resizeCanvas;
    resizeCanvas();

    function loadImage(src) { // a simple way to load images
        var temp = new Image();
        temp.src = src;
        return temp;
    }

    function absoluteValue(number) {
        return Math.abs(number);
    }
    //keyhandler
    $(document).keydown(function (event, char) {
        char = event.which; //identify what char was pressed
        keysDown[event.keyCode] = true;
    });
    $(document).keyup(function (event, char) { //removes char from array
        char = event.which;
        delete keysDown[event.keyCode];
    });
    var mode = modes.game;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    ctx.font = '20px Ubuntu Mono';

    function drawChar() {
        ctx.save();
        ctx.scale(mc.facing, 1);
        ctx.drawImage(mc.currentSprite, mc.facing * (mc.x * blockSize) - ((blockSize * mc.width) / 2) + ((2 / 16) * -blockSize), canvas.height - mc.y * blockSize, blockSize * mc.displayWidth, blockSize * mc.displayHeight);
        ctx.restore();
    }

    function absoluteValue(number) {
        return Math.sqrt(Math.pow(number, 2));
    }

    function leftRightControls() {
        var currentAccel = mc.airAccelx;
        var currentMaxSpeed = mc.walkSpeed;
        var currentFriction = mc.airFriction;
        if (mc.onGround === true) {
            currentFriction = mc.friction;
            currentAccel = mc.accelx;
        }
        if (controls.sprint in keysDown === true) {
            currentMaxSpeed = mc.runSpeed;
        }
        if (controls.right in keysDown !== controls.left in keysDown) {
            if (absoluteValue(mc.velx + currentAccel * mc.facing) <= currentMaxSpeed) {
                if (controls.right in keysDown === true) {
                    mc.velx += currentAccel;
                }
                else if (controls.left in keysDown === true) {
                    mc.velx -= currentAccel;
                }
            }
        }
        if (controls.right in keysDown === controls.left in keysDown && mc.velx !== 0) { //if theyre both up or down
            if (absoluteValue(mc.velx) - currentFriction >= 0) {
                mc.velx = approachZero(currentFriction, mc.velx);
            }
            else {
                mc.velx = 0;
            }
        }
    }

    function updateVerVel() {
        var currentFallSpeed = mc.fallSpeed;
        var currentGravity = mc.gravity;
        if (mc.onGround === false) {
            if (controls.down in keysDown === true) {
                currentFallSpeed = mc.fastFallSpeed;
                currentGravity = mc.fastFallGravity;
            }
        }
        if (controls.jump in keysDown === true) {
            if (mc.onGround === true) { //jump part
                mc.state = playerStates.jumpSquat;
                window.setTimeout(function () {
                    mc.state = playerStates.air;
                    switch (38 in keysDown === true || //up
                        32 in keysDown === true || //space
                        90 in keysDown === true) { //z
                    case false:
                        mc.vely = mc.shortHop;
                        break;
                    default:
                        mc.vely = mc.fullHop;
                        break;
                    }
                    mc.onGround = false;
                }, 1000 / 60 * mc.jumpsquatDuration); // four frame jumpsquat
            }
        }
        if (mc.vely - currentGravity > currentFallSpeed * -1) {
            mc.vely -= currentGravity;
        }
        else {
            mc.vely = currentFallSpeed * -1;
        }
    }

    function updateFacing() {
        if (controls.left in keysDown === true && controls.right in keysDown === false) { //left arrow
            mc.facing = -1;
        }
        if (controls.right in keysDown === true && controls.left in keysDown === false) { //right arrow
            mc.facing = 1;
        }
    }

    function updateSprite() {
        function updateState() {
            if (mc.onGround === true) {
                mc.state = playerStates.onGround;
            }
            else if (mc.onGround === false) {
                mc.state = playerStates.air;
            }
        }
        updateState();
        if (animationCycleCounter < 30) {
            animationCycleCounter++;
        }
        else {
            animationCycleCounter = 0;
        }
        switch (mc.state) {
        case playerStates.jumpSquat:
            mc.currentSprite = sprites.jumpsquat;
            break;
        case playerStates.air:
            if (mc.vely > 0) {
                mc.currentSprite = sprites.airUp;
            }
            else {
                mc.currentSprite = sprites.airDown;
            }
            break;
        case playerStates.onGround:
            if (absoluteValue(mc.velx) > 0) {
                mc.currentSprite = sprites.walk[absoluteValue(Math.round(animationCycleCounter / 7.5) - 2)];
            }
            else {
                mc.currentSprite = sprites.idle;
            }
            break;
        default:
            mc.currentSprite = sprites.idle;
            break;
        }
        if (controls.down in keysDown === true) {
            mc.currentSprite = sprites.crouch;
        }
    }

    function updatePos() {
        var newLocation = {
            'x': mc.x + mc.velx
            , 'y': mc.y + mc.vely * (mc.jumpSpeed / 10)
        };
        var truncatedLocation = truncatedCoordinates(newLocation);
        var charBounds = {
            'x': [newLocation.x - mc.width / 2, newLocation.x + mc.width / 2]
            , 'y': [newLocation.y, newLocation.y + mc.height]
        };
        var oldCharBounds = {
            'x': [mc.x - mc.width / 2, mc.x + mc.width / 2]
            , 'y': [mc.y, mc.y + mc.height]
        };

        function yCollision() {
            if (mc.vely > 0) {
                newLocation.y = testingBlock.bounds.y[0] - mc.height;
            }
            else if (mc.vely < 0) {
                newLocation.y = testingBlock.bounds.y[1];
                mc.onGround = true;
            }
            mc.vely = 0;
        }

        function xCollision() {
            if (mc.velx > 0) {
                newLocation.x = testingBlock.bounds.x[0] - mc.width / 2;
            }
            else if (mc.velx < 0) {
                newLocation.x = testingBlock.bounds.x[1] + mc.width / 2;
            }
            mc.velx = 0;
        }
        mc.onGround = false;
        for (let i = 0; i < 2; i++) {
            for (let i2 = 0; i2 < 3; i2++) {
                var testingBlock = getBlock(truncatedLocation.x - 1 + i2, truncatedLocation.y + i);
                var wasInsideBlock = insideBlock(oldCharBounds, testingBlock.bounds);
                var willBeInsideBlock = insideBlock(charBounds, testingBlock.bounds);
                if (willBeInsideBlock.x === true && willBeInsideBlock.y === true) {
                    if (testingBlock.collision !== false) {
                        if (wasInsideBlock.x === true && wasInsideBlock.y === false) {
                            yCollision();
                        }
                        else if (wasInsideBlock.y === true && wasInsideBlock.x === false) {
                            xCollision();
                        }
                        else if (wasInsideBlock.x === true && wasInsideBlock.y === true) {
                            mc.vely = -0.001
                            yCollision();
                        }
                    }
                }
            } //todo implement steps. this still isnt a perfect solution.
        }
        mc.y = newLocation.y;
        mc.x = newLocation.x;
    }

    function getBlock(x, y) {
        x = Math.trunc(x);
        y = Math.trunc(y);
        var blockId = reverseBlockData['air'];
        var blockName = 'air';
        var block = {
            'name': 'air'
            , 'collision': false
        }
        block.bounds = {
            'x': [x, x + 1]
            , 'y': [y, y + 1]
        };
        if (stage[x] && stage[x][y] !== undefined) {
            blockId = stage[x][y];
            blockName = reverseBlockData[stage[x][y]];
            block.name = reverseBlockData[stage[x][y]];
        }
        if (blockData[reverseBlockData[blockId]]) {
            block = blockData[reverseBlockData[blockId]];
            block.bounds = {
                'x': [x, x + 1]
                , 'y': [y, y + 1]
            };
        }
        return block;
    }

    function truncatedCoordinates(object) {
        return {
            x: Math.trunc(object.x)
            , y: Math.trunc(object.y)
        };
    }

    function debugInfo() {
        if (192 in keysDown === true && temporaryValues.debugOverlay === false) {
            if (debugOverlay === false) {
                debugOverlay = true;
            }
            else if (debugOverlay === true) {
                debugOverlay = false;
            }
            temporaryValues.debugOverlay = true;
        }
        if (192 in keysDown === false && temporaryValues.debugOverlay === true) {
            temporaryValues.debugOverlay = false;
        }
        if (debugOverlay === true) {
            ctx.fillStyle = '#263238';
            ctx.fillText('x: ' + Math.round(100 * mc.x) / 100, 0, 80);
            ctx.fillText('y: ' + Math.round(100 * mc.y) / 100, 0, 100);
            ctx.fillText('vx: ' + Math.round(100 * mc.velx) / 100, 0, 120);
            ctx.fillText('vy: ' + Math.round(100 * mc.vely) / 100, 0, 140);
            ctx.fillText('onground: ' + mc.onGround, 0, 160);
            ctx.fillText('facing: ' + mc.facing, 0, 180);
            ctx.fillText('state: ' + mc.state, 0, 200);
            //debug grid
            for (let i = 0; i < 30; i++) {
                for (let j = 0; j < Math.round(canvas.height / blockSize) + 1; j++) {
                    ctx.strokeStyle = "#000";
                    ctx.beginPath();
                    ctx.rect(i * blockSize, canvas.height - j * blockSize, blockSize, blockSize);
                    ctx.stroke();
                }
            }
        }
    }
    //sets the current level
    if (!getCookie('level')) {
        setCookie('level', 1, 9999);
    }
    else {
        //        console.log(getCookie('level'));
    }

    function drawStage() {
        $.each(stage, function (index1, val1) { //for each block in stage
            var column = val1;
            $.each(column, function (index2, val2) { //TODO make a dynamic system for blocks that can be easily
                switch (val2) {
                case blockData.black.id: //black block
                    ctx.fillStyle = "#000";
                    ctx.fillRect(index1 * blockSize, canvas.height - ((index2) * blockSize), blockSize, blockSize);
                    break;
                case blockData.basic.id: //basic block
                    ctx.drawImage(blocks.basic, index1 * blockSize, canvas.height - index2 * blockSize, blockSize, blockSize);
                    break;
                default:
                    break;
                }
            });
        });
    }
    var blockData;
    var reverseBlockData = {};
    //Load current level
    var stage = $.getJSON('levels/level' + getCookie('level') + '.json', (function () {
        blockData = stage.responseJSON.blocks;
        stage = stage.responseJSON.stage;
        window.requestAnimationFrame(mainGameLoop);
        $.each(blockData, function (key, val) {
            reverseBlockData[val.id] = key;
        });
        console.log(reverseBlockData);
    }));

    function updateCamera() {
        mc.camerax = -mc.x + viewWidth / 2;
        if (absoluteValue(mc.y - (mc.cameray + canvas.height / blockSize)) <= (canvas.height / blockSize / mc.scrollMultiplier)) {
            mc.cameray = mc.y - (canvas.height / blockSize) + (canvas.height / blockSize / mc.scrollMultiplier);
        }
        else if (absoluteValue(mc.y - mc.cameray <= (canvas.height / blockSize / mc.scrollMultiplier))) {
            mc.cameray = mc.y - (canvas.height / blockSize / mc.scrollMultiplier);
        }
    }

    function render() {
        ctx.save();
        ctx.translate(mc.camerax * blockSize, mc.cameray * blockSize);
        drawStage();
        updateSprite();
        drawChar();
        ctx.restore();
        updateCamera();
    }

    function doEntities() {}

    function mainGameLoop() {
        switch (mode) {
        case modes.game:
            ctx.clearRect(0, 0, canvas.width, canvas.height + blockSize);
            leftRightControls();
            updateVerVel();
            updatePos();
            updateFacing();
            render();
            debugInfo();
            break;
        case modes.builder:
            break;
        }
        window.requestAnimationFrame(mainGameLoop);
    }
});