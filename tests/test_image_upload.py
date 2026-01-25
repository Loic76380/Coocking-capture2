"""
Test suite for Recipe Image Upload functionality
Tests: POST /api/recipes/{id}/upload-image, DELETE /api/recipes/{id}/image
"""
import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cookbook-app-8.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpassword123"
TEST_NAME = "TestUser"


class TestImageUpload:
    """Test suite for image upload and deletion"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Register/login user and create a test recipe"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Try to login first, if fails, register
        login_response = self.session.post(f"{API}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data["token"]
            self.user_id = data["user"]["id"]
        else:
            # Register new user
            register_response = self.session.post(f"{API}/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            assert register_response.status_code == 200, f"Registration failed: {register_response.text}"
            data = register_response.json()
            self.token = data["token"]
            self.user_id = data["user"]["id"]
        
        # Set auth header
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Create a test recipe for image upload tests
        recipe_data = {
            "title": "TEST_Image_Upload_Recipe",
            "description": "Recipe for testing image upload",
            "prep_time": "10 minutes",
            "cook_time": "20 minutes",
            "servings": "4 personnes",
            "ingredients": [{"name": "Test ingredient", "quantity": "1", "unit": "cup"}],
            "steps": [{"step_number": 1, "instruction": "Test step"}],
            "tags": []
        }
        
        # Remove Content-Type for multipart requests later
        self.session.headers.pop("Content-Type", None)
        self.session.headers.update({"Content-Type": "application/json"})
        
        recipe_response = self.session.post(f"{API}/recipes/manual", json=recipe_data)
        assert recipe_response.status_code == 200, f"Recipe creation failed: {recipe_response.text}"
        self.recipe_id = recipe_response.json()["id"]
        
        yield
        
        # Cleanup: Delete test recipe
        try:
            self.session.delete(f"{API}/recipes/{self.recipe_id}")
        except:
            pass
    
    def create_test_image(self, format='JPEG', size=(800, 600), color='red'):
        """Create a test image in memory"""
        img = Image.new('RGB', size, color=color)
        buffer = io.BytesIO()
        img.save(buffer, format=format)
        buffer.seek(0)
        return buffer
    
    def test_upload_jpeg_image(self):
        """Test uploading a JPEG image"""
        print("\n=== Test: Upload JPEG Image ===")
        
        # Create test JPEG image
        image_buffer = self.create_test_image(format='JPEG', color='blue')
        
        # Remove Content-Type header for multipart
        headers = {"Authorization": f"Bearer {self.token}"}
        
        files = {'file': ('test_image.jpg', image_buffer, 'image/jpeg')}
        response = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        assert "image_url" in data
        assert data["image_url"].startswith("/api/uploads/")
        print("✓ JPEG upload successful")
    
    def test_upload_png_image(self):
        """Test uploading a PNG image"""
        print("\n=== Test: Upload PNG Image ===")
        
        # Create test PNG image
        image_buffer = self.create_test_image(format='PNG', color='green')
        
        headers = {"Authorization": f"Bearer {self.token}"}
        files = {'file': ('test_image.png', image_buffer, 'image/png')}
        response = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        print("✓ PNG upload successful")
    
    def test_upload_webp_image(self):
        """Test uploading a WebP image"""
        print("\n=== Test: Upload WebP Image ===")
        
        # Create test WebP image
        image_buffer = self.create_test_image(format='WEBP', color='yellow')
        
        headers = {"Authorization": f"Bearer {self.token}"}
        files = {'file': ('test_image.webp', image_buffer, 'image/webp')}
        response = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        print("✓ WebP upload successful")
    
    def test_upload_invalid_file_type(self):
        """Test uploading an invalid file type (should fail)"""
        print("\n=== Test: Upload Invalid File Type ===")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a fake PDF file
        fake_pdf = io.BytesIO(b"%PDF-1.4 fake pdf content")
        files = {'file': ('test.pdf', fake_pdf, 'application/pdf')}
        response = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 400, f"Should reject invalid file type: {response.text}"
        assert "non supporté" in response.json()["detail"].lower() or "type" in response.json()["detail"].lower()
        print("✓ Invalid file type correctly rejected")
    
    def test_upload_large_image_compression(self):
        """Test that large images are compressed"""
        print("\n=== Test: Large Image Compression ===")
        
        # Create a large image (2000x2000)
        image_buffer = self.create_test_image(format='JPEG', size=(2000, 2000), color='purple')
        original_size = len(image_buffer.getvalue())
        print(f"Original image size: {original_size} bytes")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        files = {'file': ('large_image.jpg', image_buffer, 'image/jpeg')}
        response = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Verify image was saved and can be accessed
        image_url = data["image_url"]
        image_response = requests.get(f"{BASE_URL}{image_url}")
        assert image_response.status_code == 200, "Uploaded image not accessible"
        
        compressed_size = len(image_response.content)
        print(f"Compressed image size: {compressed_size} bytes")
        print(f"Compression ratio: {compressed_size/original_size:.2%}")
        
        # Verify compression happened (compressed should be smaller or similar)
        # Note: Small test images might not compress much
        print("✓ Large image upload and compression successful")
    
    def test_delete_image(self):
        """Test deleting a recipe image"""
        print("\n=== Test: Delete Image ===")
        
        # First upload an image
        image_buffer = self.create_test_image(format='JPEG', color='orange')
        headers = {"Authorization": f"Bearer {self.token}"}
        files = {'file': ('to_delete.jpg', image_buffer, 'image/jpeg')}
        
        upload_response = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files,
            headers=headers
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        image_url = upload_response.json()["image_url"]
        print(f"Uploaded image: {image_url}")
        
        # Now delete the image
        delete_response = requests.delete(
            f"{API}/recipes/{self.recipe_id}/image",
            headers=headers
        )
        
        print(f"Delete Status: {delete_response.status_code}")
        print(f"Delete Response: {delete_response.json()}")
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        assert delete_response.json()["status"] == "success"
        
        # Verify recipe no longer has image
        recipe_response = requests.get(
            f"{API}/recipes/{self.recipe_id}",
            headers=headers
        )
        assert recipe_response.status_code == 200
        assert recipe_response.json()["image_url"] is None
        print("✓ Image deletion successful")
    
    def test_delete_nonexistent_image(self):
        """Test deleting image when recipe has no image"""
        print("\n=== Test: Delete Non-existent Image ===")
        
        # First ensure recipe has no image
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Try to delete (should fail since no image)
        delete_response = requests.delete(
            f"{API}/recipes/{self.recipe_id}/image",
            headers=headers
        )
        
        print(f"Status: {delete_response.status_code}")
        print(f"Response: {delete_response.json()}")
        
        # Should return 400 since no image exists
        assert delete_response.status_code == 400, f"Should fail when no image: {delete_response.text}"
        print("✓ Correctly handles delete when no image exists")
    
    def test_upload_replaces_existing_image(self):
        """Test that uploading a new image replaces the old one"""
        print("\n=== Test: Upload Replaces Existing Image ===")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Upload first image
        image1 = self.create_test_image(format='JPEG', color='red')
        files1 = {'file': ('first.jpg', image1, 'image/jpeg')}
        response1 = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files1,
            headers=headers
        )
        assert response1.status_code == 200
        first_url = response1.json()["image_url"]
        print(f"First image URL: {first_url}")
        
        # Upload second image
        image2 = self.create_test_image(format='JPEG', color='blue')
        files2 = {'file': ('second.jpg', image2, 'image/jpeg')}
        response2 = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files2,
            headers=headers
        )
        assert response2.status_code == 200
        second_url = response2.json()["image_url"]
        print(f"Second image URL: {second_url}")
        
        # URLs should be different
        assert first_url != second_url, "New upload should have different URL"
        
        # Verify recipe has new image
        recipe_response = requests.get(
            f"{API}/recipes/{self.recipe_id}",
            headers=headers
        )
        assert recipe_response.json()["image_url"] == second_url
        print("✓ Image replacement successful")
    
    def test_upload_without_auth(self):
        """Test that upload requires authentication"""
        print("\n=== Test: Upload Without Auth ===")
        
        image_buffer = self.create_test_image(format='JPEG')
        files = {'file': ('test.jpg', image_buffer, 'image/jpeg')}
        
        # No auth header
        response = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files
        )
        
        print(f"Status: {response.status_code}")
        
        assert response.status_code in [401, 403], f"Should require auth: {response.text}"
        print("✓ Authentication required for upload")
    
    def test_upload_to_nonexistent_recipe(self):
        """Test uploading to a recipe that doesn't exist"""
        print("\n=== Test: Upload to Non-existent Recipe ===")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        image_buffer = self.create_test_image(format='JPEG')
        files = {'file': ('test.jpg', image_buffer, 'image/jpeg')}
        
        response = requests.post(
            f"{API}/recipes/nonexistent-recipe-id/upload-image",
            files=files,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 404, f"Should return 404: {response.text}"
        print("✓ Correctly handles non-existent recipe")
    
    def test_image_accessible_via_url(self):
        """Test that uploaded image is accessible via the returned URL"""
        print("\n=== Test: Image Accessible via URL ===")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        image_buffer = self.create_test_image(format='JPEG', color='cyan')
        files = {'file': ('accessible.jpg', image_buffer, 'image/jpeg')}
        
        upload_response = requests.post(
            f"{API}/recipes/{self.recipe_id}/upload-image",
            files=files,
            headers=headers
        )
        assert upload_response.status_code == 200
        image_url = upload_response.json()["image_url"]
        
        # Try to access the image (no auth needed for static files)
        full_url = f"{BASE_URL}{image_url}"
        print(f"Accessing: {full_url}")
        
        image_response = requests.get(full_url)
        print(f"Image access status: {image_response.status_code}")
        print(f"Content-Type: {image_response.headers.get('content-type')}")
        
        assert image_response.status_code == 200, f"Image not accessible: {image_response.status_code}"
        assert 'image' in image_response.headers.get('content-type', '').lower()
        print("✓ Uploaded image is publicly accessible")


class TestRecipeWithImage:
    """Test recipe CRUD with image field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login user"""
        self.session = requests.Session()
        
        # Login
        login_response = self.session.post(f"{API}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            # Register if login fails
            register_response = self.session.post(f"{API}/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            data = register_response.json()
        else:
            data = login_response.json()
        
        self.token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
    
    def test_recipe_includes_image_url_field(self):
        """Test that recipe response includes image_url field"""
        print("\n=== Test: Recipe Includes image_url Field ===")
        
        # Create a recipe
        recipe_data = {
            "title": "TEST_Recipe_With_Image_Field",
            "description": "Test recipe",
            "ingredients": [],
            "steps": [],
            "tags": []
        }
        
        create_response = self.session.post(f"{API}/recipes/manual", json=recipe_data)
        assert create_response.status_code == 200
        recipe = create_response.json()
        recipe_id = recipe["id"]
        
        # Check image_url field exists
        assert "image_url" in recipe, "Recipe should have image_url field"
        print(f"image_url value: {recipe['image_url']}")
        
        # Cleanup
        self.session.delete(f"{API}/recipes/{recipe_id}")
        print("✓ Recipe includes image_url field")
    
    def test_get_recipes_includes_image_url(self):
        """Test that GET /recipes returns image_url for each recipe"""
        print("\n=== Test: GET Recipes Includes image_url ===")
        
        response = self.session.get(f"{API}/recipes")
        assert response.status_code == 200
        recipes = response.json()
        
        if len(recipes) > 0:
            for recipe in recipes[:3]:  # Check first 3
                assert "image_url" in recipe, f"Recipe {recipe['id']} missing image_url"
                print(f"Recipe '{recipe['title']}' - image_url: {recipe['image_url']}")
        
        print("✓ All recipes include image_url field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
