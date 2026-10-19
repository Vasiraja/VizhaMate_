package dev.springs.springpro.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.annotation.ResponseStatusExceptionResolver;

import dev.springs.springpro.model.Product;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.net.http.HttpResponse.ResponseInfo;
import java.util.ArrayList;
import java.util.List;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
public class ProductController {

    private List<Product> products = new ArrayList<>();

    @PostMapping("/add")

    public Product addProduct(@RequestBody Product product) {

        for (Product existingProduct : products) {
            if (existingProduct.getId() == product.getId()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Product Already Exists");
            }

        }

        products.add(product);

        return product;
    }

    @GetMapping("getproducts")

    public List<Product> getProducts() {
        return products;

    }

    @GetMapping("/products/{id}")
    public Product getMethodName(@PathVariable int id) {
        for (Product product : products) {
            if (product.getId() == id) {
                return product;
            }
        }
        return null;
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<Product> updateProduct(
            @PathVariable int id,
            @RequestBody Product updatedProduct) {

        try {
            for (Product product : products) {
                if (product.getId() == id) {
                    product.setProductName(updatedProduct.getProductName());
                    product.setProductPrice(updatedProduct.getProductPrice());
                    product.setProductQuantity(updatedProduct.getProductQuantity());

                    return ResponseEntity.ok(product);
                }
            }

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Product ID " + id + " not found");
        } catch (Exception e) {
            System.out.println("------------------------------------");
            System.out.println(e);
            System.out.println("------------------------------------");
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Error server");

        }

    }

    @DeleteMapping("/del/{id}")

    public ResponseEntity<String> deleteUser(@PathVariable int id) {

        try {
            for (Product product : products) {
                if (product.getId() == id) {
                    products.remove(product);
                    return ResponseEntity.ok("succussfully deleted");

                }
            }
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Id Not Found");

        }

        catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());

        }

    }
}
