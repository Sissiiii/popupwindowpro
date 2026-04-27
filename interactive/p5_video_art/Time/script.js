const clockContainer = document.getElementById('clock-container');
const physicsContainer = document.getElementById('physics-container');

// --- Matter.js Physics Setup ---
const { Engine, Runner, World, Bodies, Events, Mouse, MouseConstraint } = Matter;
const engine = Engine.create();
const world = engine.world;
engine.world.gravity.y = 0.5;

// --- World Boundaries ---
const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight, window.innerWidth, 60, { isStatic: true, label: 'ground' });
World.add(world, [ground]);

// --- Mouse Pusher Interaction ---
// Create a static body that will follow the mouse to push other bodies
const mousePusher = Matter.Bodies.circle(-100, -100, 40, { // Start off-screen, 40px radius for pushing
    isStatic: true,
    render: { visible: false } // Make it invisible
});
World.add(world, mousePusher);

// Move the pusher to the mouse's position on move
physicsContainer.addEventListener('mousemove', (event) => {
    Matter.Body.setPosition(mousePusher, { x: event.clientX, y: event.clientY });
});

// Move the pusher off-screen when the mouse leaves the container
physicsContainer.addEventListener('mouseleave', () => {
    Matter.Body.setPosition(mousePusher, { x: -100, y: -100 });
});



const runner = Runner.create();
Runner.run(runner, engine);

// --- Constants & State ---
const segmentMap = {
    '0': '1111110', '1': '0110000', '2': '1101101', '3': '1111001', '4': '0110011',
    '5': '1011011', '6': '1011111', '7': '1110000', '8': '1111111', '9': '1111011'
};
const MAX_PHYSICS_OBJECTS = 2500; // High limit is now feasible with this new approach
let physicsObjects = [];
let previousTimeString = '      ';

// --- Clock Initialization ---
const digits = Array.from({ length: 6 }, () => createDigit());
for (let i = 0; i < digits.length; i++) {
    clockContainer.appendChild(digits[i]);
    if (i === 1 || i === 3) {
        clockContainer.appendChild(createSeparator());
    }
}

// --- Hover to Ignite Logic ---
let burnTimeout = null;
clockContainer.addEventListener('mouseenter', (event) => {
    const target = event.target;
    if (target.classList.contains('segment') && target.classList.contains('on')) {
        clearTimeout(burnTimeout); // Clear any pending timeout to remove the class
        target.classList.add('is-burning');
    }
}, true); // Use event capturing to handle events on the container

clockContainer.addEventListener('mouseleave', (event) => {
    const target = event.target;
    if (target.classList.contains('segment') && target.classList.contains('on')) {
        // Set a timeout to remove the class after a delay
        burnTimeout = setTimeout(() => {
            target.classList.remove('is-burning');
        }, 2500); // 2.5 seconds delay
    }
}, true); // Use event capturing



// --- Core Update Logic ---
function updateClock() {
    const timeString = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    digits.forEach((digit, i) => {
        const previousDigitChar = previousTimeString[i];
        const currentDigitChar = timeString[i];
        if (previousDigitChar === currentDigitChar) return;

        const oldSegments = segmentMap[previousDigitChar] || '0000000';
        const newSegments = segmentMap[currentDigitChar] || '0000000';

        for (let j = 0; j < 7; j++) {
            const segmentElement = digit.children[j];
            const wasOn = oldSegments[j] === '1';
            const isOn = newSegments[j] === '1';

            if (wasOn && !isOn) handleSegmentOff(segmentElement);
            if (!wasOn && isOn) handleSegmentOn(segmentElement);

            segmentElement.classList.toggle('on', isOn);
        }
    });
    previousTimeString = timeString;
}

// --- Event & Object Handlers ---
function handleSegmentOff(segmentElement) {
    const rect = segmentElement.getBoundingClientRect();
    // FINAL, CORRECT WAY: Check the element's class name directly.
    // This is immune to rendering timing issues.
    const isRotated = ['segment-b', 'segment-c', 'segment-e', 'segment-f'].some(c => segmentElement.classList.contains(c));
    createPhysicsAsh(rect, isRotated);
    segmentElement.querySelectorAll('.ember').forEach(e => e.remove());
}

function handleSegmentOn(segmentElement) {
    for (let k = 0; k < 3; k++) {
        const ember = document.createElement('div');
        ember.classList.add('ember');
        ember.style.left = `${Math.random() * 100}%`;
        ember.style.top = `${Math.random() * 100}%`;
        ember.style.animationDelay = `${Math.random() * 1.5}s`;
        ember.style.animationDuration = `${1 + Math.random()}s`;
        segmentElement.appendChild(ember);
    }
}

// --- Physics & Element Creation ---
function createPhysicsAsh(rect, isRotated) {
    // Shorten length by 15%, keep thickness the same.
    const lengthScaleFactor = 0.85;
    const newWidth = 80 * lengthScaleFactor; // Length is shortened
    const newHeight = 14; // Thickness is unchanged

    const body = Bodies.rectangle(
        rect.left + rect.width / 2, rect.top + rect.height / 2, newWidth, newHeight,
        {
            restitution: 0.1,
            friction: 0.4, // Lower friction to allow sliding
            chamfer: { radius: 4 }, // Add rounded corners to make stacking unstable
            angle: isRotated ? Math.PI / 2 : 0,
            label: 'ash'
        }
    );
    const element = document.createElement('div');
    element.className = 'ash';
    element.style.width = `${newWidth}px`;
    element.style.height = `${newHeight}px`;
    addPhysicsObject(body, element);
}

function addPhysicsObject(body, element) {
    body.element = element;
    element.body = body;
    World.add(world, body);
    physicsContainer.appendChild(element);
    physicsObjects.push({ element, body });
}

// --- Utility Functions ---
function createDigit() {
    const digit = document.createElement('div');
    digit.className = 'digit';
    digit.innerHTML = Array.from({ length: 7 }, (_, i) => 
        `<div class="segment segment-${String.fromCharCode(97 + i)}">
            <div class="flame"></div>
            <div class="flame"></div>
            <div class="flame"></div>
         </div>`
    ).join('');
    return digit;
}

function createSeparator() {
    const separator = document.createElement('div');
    separator.className = 'separator';
    separator.textContent = ':';
    return separator;
}

function cleanupPhysicsObjects() {
    // 1. Cleanup objects that are off-screen
    for (let i = physicsObjects.length - 1; i >= 0; i--) {
        const obj = physicsObjects[i];
        if (obj.body.position.y > window.innerHeight + 50 || obj.body.position.y < -50 || obj.body.position.x < -50 || obj.body.position.x > window.innerWidth + 50) {
            World.remove(world, obj.body);
            obj.element.remove();
            physicsObjects.splice(i, 1);
        }
    }

    // 2. Random wind gust when approaching limit
    if (physicsObjects.length > MAX_PHYSICS_OBJECTS * 0.9 && Math.random() < 0.05) {
        blowWind();
    }

    // 3. Cleanup oldest objects if total exceeds the limit
    if (physicsObjects.length > MAX_PHYSICS_OBJECTS) {
        const objectsToRemove = physicsObjects.splice(0, physicsObjects.length - MAX_PHYSICS_OBJECTS);
        objectsToRemove.forEach(obj => {
            World.remove(world, obj.body);
            obj.element.remove();
        });
    }
}

// --- Collision & Wind Effects ---

// Turns a body into small rectangular "ash dots". Returns the new bodies.
function _turnToAsh(body) {
    const position = body.position;
    
    World.remove(world, body);
    if (body.element) body.element.remove();
    physicsObjects = physicsObjects.filter(obj => obj.body !== body);

    const newDots = [];
    const dotCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < dotCount; i++) {
        const ashDotBody = Bodies.rectangle(
            position.x + (Math.random() - 0.5) * 15,
            position.y + (Math.random() - 0.5) * 15,
            2, 4,
            {
                restitution: 0.4,
                friction: 0.1,
                label: 'ash-dot',
                angle: Math.random() * Math.PI
            }
        );
        const dotElement = document.createElement('div');
        dotElement.className = 'ash-dot';
        dotElement.style.width = '2px';
        dotElement.style.height = '4px';
        addPhysicsObject(ashDotBody, dotElement);
        newDots.push(ashDotBody);
    }
    return newDots;
}

// On click, turns all rectangles into ash and applies a directional puff of wind.
function blowWind(event) {
    // Wind force increased by 15% from the last version.
    const baseForce = 0.00023; // 0.0002 * 1.15
    let windVector = { x: baseForce * 2.5, y: -baseForce * 2.5 }; // Default for auto-trigger

    if (event) { // Manual trigger
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        let dx = centerX - mouseX;
        let dy = centerY - mouseY;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 0) {
            dx /= magnitude;
            dy /= magnitude;
        }
        const forceScale = baseForce + (magnitude / (window.innerWidth / 2)) * baseForce;
        windVector = { x: dx * forceScale, y: dy * forceScale };
    }
    
    const allNewDots = [];
    const currentObjects = [...physicsObjects];
    for (const obj of currentObjects) {
        // ONLY turn rectangles into ash, not existing dots.
        if (obj.body.label === 'ash' || obj.body.label === 'fragment') {
            const newDots = _turnToAsh(obj.body);
            allNewDots.push(...newDots);
        }
    }

    // Apply wind force to ALL existing ash dots.
    setTimeout(() => {
        for (const obj of physicsObjects) {
            if (obj.body.label === 'ash-dot') { // Target all dots
                const force = {
                    x: windVector.x * (0.8 + Math.random() * 0.4),
                    y: windVector.y * (0.8 + Math.random() * 0.4)
                };
                Matter.Body.applyForce(obj.body, obj.body.position, force);
            }
        }
    }, 0);
}

// On landing, a full ash stick breaks into larger fragments.
Events.on(engine, 'collisionStart', function(event) {
    event.pairs.forEach(pair => {
        let ashBody = null;
        if (pair.bodyA.label === 'ash' && pair.bodyB.label === 'ground') {
            ashBody = pair.bodyA;
        } else if (pair.bodyB.label === 'ash' && pair.bodyA.label === 'ground') {
            ashBody = pair.bodyB;
        }

        if (ashBody && !ashBody.isDisintegrating) {
            ashBody.isDisintegrating = true;
            _turnToFragments(ashBody);
        }
    });
});

// Turns a body into 2-3 larger rectangular fragments.
function _turnToFragments(body) {
    const position = body.position;
    const angle = body.angle;

    World.remove(world, body);
    if (body.element) body.element.remove();
    physicsObjects = physicsObjects.filter(obj => obj.body !== body);

    const fragmentCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < fragmentCount; i++) {
        const fragmentBody = Bodies.rectangle(
            position.x + (Math.random() - 0.5) * 5,
            position.y + (Math.random() - 0.5) * 5,
            20, 4,
            {
                label: 'fragment',
                restitution: 0.2,
                friction: 0.5,
                angle: angle + (Math.random() - 0.5) * 0.5
            }
        );
        const fragmentElement = document.createElement('div');
        fragmentElement.className = 'ash-fragment';
        addPhysicsObject(fragmentBody, fragmentElement);
    }
}

// Add click trigger for the global wind effect.
physicsContainer.addEventListener('click', blowWind);

// --- Render & Start ---
(function render() {
    cleanupPhysicsObjects();

    for (const obj of physicsObjects) {
        const { x, y } = obj.body.position;
        const angle = obj.body.angle;
        obj.element.style.transform = `translate(${x - obj.element.offsetWidth / 2}px, ${y - obj.element.offsetHeight / 2}px) rotate(${angle}rad)`;
    }
    requestAnimationFrame(render);
})();

setInterval(updateClock, 1000);
updateClock();
