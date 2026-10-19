package dev.springs.springpro.model;

import lombok.Data;

@Data 
public class Product {


    private int id;
    private String productName;
    private double productPrice;
    private int productQuantity;

}
