// DOM Elements
const placeInput = document.getElementById('placeInput');
const addPlaceBtn = document.getElementById('addPlaceBtn');
const placesList = document.getElementById('placesList');
const leadingPlace = document.getElementById('leadingPlace');
const deletePollBtn = document.getElementById('deletePollBtn');

// Firebase Configuration
const firebaseConfig = {
  ......
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database(); // Reference to the Realtime Database

// Unique user identifier (simulate user session)
const userId = localStorage.getItem('userId') || generateUserId();
localStorage.setItem('userId', userId);

// Function to generate a unique user ID
function generateUserId() {
  return 'user-' + Math.random().toString(36).substr(2, 9);
}

// Add a new place to the database when the "Add" button is clicked
addPlaceBtn.addEventListener('click', () => {
  const placeName = placeInput.value.trim(); // Get the input value and trim extra spaces

  if (placeName) {
    // Check if the place already exists in the database
    database.ref(`places/${placeName}`).once('value', (snapshot) => {
      if (snapshot.exists()) {
        // Notify the user that the place already exists
        showNotification(`"${placeName}" already exists!`, "info");
      } else {
        // Add the place to the database with 0 votes
        database.ref(`places/${placeName}`).set({
          votes: 0,
          voters: {},
          timestamp: new Date().toISOString() // Add a timestamp for the place
        }).then(() => {
          placeInput.value = ''; // Clear the input field
          showNotification(`"${placeName}" added successfully!`, "success");
        }).catch((error) => {
          console.error("Error adding place:", error); // Handle errors
          showNotification("Failed to add the place. Try again.", "error");
        });
      }
    }).catch((error) => {
      console.error("Error checking place:", error); // Handle errors
    });
  } else {
    showNotification("Please enter a valid place name.", "error");
  }
});


// Listen for changes in the database and update the UI in real-time
database.ref('places').on('value', (snapshot) => {
  const data = snapshot.val(); // Fetch all places and votes
  toggleDeletePollButton(data); // Toggle the delete button visibility
  if (data) {
    renderPlaces(data); // Render the places list
  } else {
    placesList.innerHTML = ''; // Clear the list if no data exists
    leadingPlace.textContent = 'Leading Place: None';
  }
});

// Toggle visibility of the "Delete Poll" button
function toggleDeletePollButton(data) {
  if (data && Object.keys(data).length > 0) {
    deletePollBtn.style.display = 'block'; // Show the button
  } else {
    deletePollBtn.style.display = 'none'; // Hide the button
  }
}

// Render the places list dynamically based on the database
function renderPlaces(data) {
  placesList.innerHTML = ''; // Clear the current list
  let maxVotes = 0; // Track the maximum votes
  let leading = 'None'; // Track the leading place

  Object.keys(data).forEach((place) => {
    const { votes } = data[place]; // Get the vote count for the place
    const voters = data[place].voters || {}; // Get the voters for the place

    // Create a list item for the place
    const li = document.createElement('li');
    li.innerHTML = `<strong>${place}</strong> - Votes: ${votes}`;
    li.className = 'place-item'; // Add a class for styling (optional)

    // Disable the ability to vote if the user has already voted for this place
    if (voters[userId]) {
      li.classList.add('voted'); // Add a "voted" class for styling
      li.style.pointerEvents = 'none'; // Disable click events for this item
    } else {
      // Add an event listener to handle voting when the item is clicked
      li.addEventListener('click', () => {
        handleVote(place, voters[userId]);
      });
    }

    placesList.appendChild(li); // Add the list item to the list

    // Update the leading place if this place has more votes
    if (votes > maxVotes) {
      maxVotes = votes;
      leading = `${place} with ${maxVotes} votes`;
    }
  });

  // Update the leading place text
  leadingPlace.textContent = `Leading Place: ${leading}`;
}




// Handle voting logic
function handleVote(place, userHasVoted) {
  // Fetch all places and find where the user has already voted
  database.ref('places').once('value', (snapshot) => {
    const data = snapshot.val();
    let previousVote = null;

    // Search for the restaurant the user has previously voted for
    Object.keys(data).forEach((existingPlace) => {
      const voters = data[existingPlace].voters || {};
      if (voters[userId]) {
        previousVote = existingPlace;
      }
    });

    if (previousVote && previousVote !== place) {
      // Remove vote from the previous place
      database.ref(`places/${previousVote}/votes`).transaction((currentVotes) => {
        return (currentVotes || 0) - 1;
      });
      database.ref(`places/${previousVote}/voters/${userId}`).remove();
    }

    if (!userHasVoted || previousVote !== place) {
      // Add vote to the current place
      database.ref(`places/${place}/votes`).transaction((currentVotes) => {
        return (currentVotes || 0) + 1;
      });
      database.ref(`places/${place}/voters/${userId}`).set(true);
      showNotification(`You voted for "${place}".`, "success");
    } else {
      showNotification(`You have already voted for "${place}".`, "info");
    }
  });
}


// Show notifications with auto-hide
function showNotification(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = `notification ${type}`;

  // Style the notification
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.backgroundColor = type === 'success' ? '#4caf50' : type === 'info' ? '#2196f3' : '#f44336';
  notification.style.color = '#ffffff';
  notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  notification.style.fontSize = '16px';

  // Append the notification to the body
  document.body.appendChild(notification);

  // Remove the notification after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}


// Delete all places and votes from the database when the "Delete Poll" button is clicked
deletePollBtn.addEventListener('click', () => {
  database.ref('places').remove().then(() => {
    console.log("Poll deleted successfully");
    showNotification("Poll deleted successfully!", "success");
  }).catch(error => {
    console.error("Error deleting poll:", error); // Handle errors
    showNotification("Failed to delete the poll. Try again.", "error");
  });
});
