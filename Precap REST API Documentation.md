# Precap REST API Documentation
Welcome to the Precap REST API documentation. This API allows you to interact with Precap's messaging and user management features. Follow the guide below to get started.

## Getting Started
To use the Precap API, make HTTP requests to the specified endpoints. Include the required parameters in the request body, headers, or query parameters as indicated for each endpoint. Some routes require authentication through a valid token.

## Endpoints
New Message <br>
Endpoint: /newMessage <br>
Method: POST <br>
Description: Create a new message. <br>
Parameters: <br>
email (Body): Sender's email. <br>
Example: <br>
```json
"email": "sender@example.com"
```
Controller Method: controller.newMessage
Create Account
Endpoint: /createAccount
Method: POST
Description: Create a new Precap user account.
Parameters:
name (Body): User's name.
password (Body): User's password.
email (Body): User's email.
phone (Body): User's phone number.
Example:
json
Copy code
{
  "name": "John Doe",
  "password": "securepassword",
  "email": "john.doe@example.com",
  "phone": "123-456-7890"
}
Controller Method: controller.createAccount
User Login
Endpoint: /userLogin
Method: POST
Description: Authenticate and log in a Precap user.
Parameters:
email (Body): User's email.
password (Body): User's password.
Example:
json
Copy code
{
  "email": "john.doe@example.com",
  "password": "securepassword"
}
Controller Method: controller.userLogin
Add Posts
Endpoint: /addPosts
Method: POST
Description: Add posts with an attached image.
Authentication: Token required (Include the token in the request headers).
Parameters:
image (File): Image file to be uploaded.
Controller Method: controller.addPosts
Delete Posts
Endpoint: /deletePosts
Method: DELETE
Description: Delete posts.
Authentication: Token required (Include the token in the request headers).
Controller Method: controller.deletePosts
Response:
json
Copy code
{
  "data": "Token is valid",
  "decodedData": "Decoded user data from the token"
}
Get File
Endpoint: /getFile
Method: GET
Description: Retrieve a file.
Controller Method: controller.getFile
